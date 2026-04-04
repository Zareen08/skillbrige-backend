import prisma from '../config/database';

export class ReviewService {
  static async createReview(data: {
    rating: number;
    comment: string;
    studentId: string;
    tutorId: string;
    bookingId: string;
  }) {
    // Check if booking exists and is completed
    const booking = await prisma.booking.findFirst({
      where: {
        id: data.bookingId,
        studentId: data.studentId,
        status: 'COMPLETED',
      },
    });
    
    if (!booking) {
      throw new Error('Booking not found or not completed');
    }
    
    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { bookingId: data.bookingId },
    });
    
    if (existingReview) {
      throw new Error('Review already exists for this booking');
    }
    
    // Create review
    const review = await prisma.review.create({
      data: {
        rating: data.rating,
        comment: data.comment,
        studentId: data.studentId,
        tutorId: data.tutorId,
        bookingId: data.bookingId,
      },
      include: {
        student: {
          select: { name: true, avatar: true },
        },
        booking: true,
      },
    });
    
    // Update booking isReviewed flag
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: { isReviewed: true },
    });
    
    // Update tutor rating
    await this.updateTutorRating(data.tutorId);
    
    return review;
  }
  
  static async getTutorReviews(tutorId: string) {
    return await prisma.review.findMany({
      where: { tutorId },
      include: {
        student: {
          select: { name: true, avatar: true },
        },
        booking: {
          select: { date: true, duration: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  
  static async updateTutorRating(tutorId: string) {
    const reviews = await prisma.review.findMany({
      where: { tutorId },
    });
    
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      
      await prisma.tutorProfile.update({
        where: { userId: tutorId },
        data: {
          rating: avgRating,
          totalReviews: reviews.length,
        },
      });
    } else {
      await prisma.tutorProfile.update({
        where: { userId: tutorId },
        data: {
          rating: 0,
          totalReviews: 0,
        },
      });
    }
  }
  
  static async deleteReview(reviewId: string, userId: string, userRole: string) {
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });
    
    if (!existingReview) {
      throw new Error('Review not found');
    }
    
    if (existingReview.studentId !== userId && userRole !== 'ADMIN') {
      throw new Error('Forbidden');
    }
    
    await prisma.review.delete({
      where: { id: reviewId },
    });
    
    // Update booking isReviewed flag
    await prisma.booking.update({
      where: { id: existingReview.bookingId },
      data: { isReviewed: false },
    });
    
    // Recalculate tutor rating
    await this.updateTutorRating(existingReview.tutorId);
    
    return { message: 'Review deleted successfully' };
  }
}