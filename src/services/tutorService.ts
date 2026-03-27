import prisma from '../config/database';
import { 
  TutorFilters, 
  TutorWithDetails, 
  TutorStats,
  ReviewWithStudent,
  FilterBuilder,
  NotFoundError 
} from '../types';

export class TutorService {
  static async getAllTutors(filters: TutorFilters = {}): Promise<TutorWithDetails[]> {
    try {
      const where = FilterBuilder.buildTutorWhere(filters);
      const orderBy = FilterBuilder.buildTutorOrderBy(filters);
      
      const tutors = await prisma.tutorProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              isActive: true,
            }
          }
        },
        orderBy,
      });
      
      // Filter active tutors and apply search
      let filteredTutors = tutors.filter(tutor => 
        tutor.user !== null && tutor.user.isActive === true
      );
      
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase().trim();
        filteredTutors = filteredTutors.filter(tutor => {
          const titleMatch = (tutor.title || '').toLowerCase().includes(searchLower);
          const bioMatch = (tutor.bio || '').toLowerCase().includes(searchLower);
          const nameMatch = (tutor.user?.name || '').toLowerCase().includes(searchLower);
          const subjectMatch = (tutor.subjects || []).some(s => 
            s.toLowerCase().includes(searchLower)
          );
          
          return titleMatch || bioMatch || nameMatch || subjectMatch;
        });
      }
      
      // Apply pagination if provided
      if (filters.page && filters.limit) {
        const { skip, take } = FilterBuilder.getPagination(filters.page, filters.limit);
        filteredTutors = filteredTutors.slice(skip, skip + take);
      }
      
      return filteredTutors as TutorWithDetails[];
    } catch (error) {
      console.error('Error in getAllTutors:', error);
      throw new Error('Failed to fetch tutors');
    }
  }
  
  static async getTutorById(tutorId: string): Promise<TutorWithDetails> {
    try {
      // First, try to find by tutor profile ID
      let tutor = await prisma.tutorProfile.findUnique({
        where: { id: tutorId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              isActive: true,
            }
          }
        }
      });
      
      // If not found by profile ID, try to find by user ID
      if (!tutor) {
        tutor = await prisma.tutorProfile.findUnique({
          where: { userId: tutorId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                isActive: true,
              }
            }
          }
        });
      }
      
      if (!tutor) {
        throw new NotFoundError('Tutor');
      }
      
      if (!tutor.user) {
        throw new NotFoundError('Tutor user account');
      }
      
      if (!tutor.user.isActive) {
        throw new Error('Tutor account is inactive');
      }
      
      // Get reviews
      const reviews = await prisma.review.findMany({
        where: { tutorId: tutor.userId },
        include: {
          student: {
            select: { 
              id: true,
              name: true, 
              avatar: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Cast reviews to ReviewWithStudent type
      const typedReviews: ReviewWithStudent[] = reviews.map(review => ({
        ...review,
        student: {
          id: review.student.id,
          name: review.student.name,
          avatar: review.student.avatar,
          email: review.student.email
        }
      }));
      
      // Get tutor stats
      const stats = await prisma.booking.aggregate({
        where: {
          tutorId: tutor.userId,
          status: 'COMPLETED',
        },
        _count: true,
        _sum: {
          totalAmount: true,
        },
      });
      
      return { 
        ...tutor, 
        reviews: typedReviews,
        stats: {
          totalCompletedSessions: stats._count || 0,
          totalEarnings: stats._sum?.totalAmount || 0,
        }
      } as TutorWithDetails;
    } catch (error) {
      console.error('Error in getTutorById:', error);
      throw error;
    }
  }
  
  static async updateProfile(userId: string, data: {
    title?: string;
    bio?: string;
    subjects?: string[];
    hourlyRate?: number;
    experience?: number;
    education?: string;
    availability?: any;
  }) {
    try {
      // Check if tutor profile exists
      const existingProfile = await prisma.tutorProfile.findUnique({
        where: { userId }
      });
      
      if (!existingProfile) {
        throw new NotFoundError('Tutor profile');
      }
      
      const updatedProfile = await prisma.tutorProfile.update({
        where: { userId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.subjects !== undefined && { subjects: data.subjects }),
          ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
          ...(data.experience !== undefined && { experience: data.experience }),
          ...(data.education !== undefined && { education: data.education }),
          ...(data.availability !== undefined && { availability: data.availability }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            }
          }
        }
      });
      
      return updatedProfile;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }
  
  static async updateAvailability(userId: string, availability: any) {
    try {
      const updatedProfile = await prisma.tutorProfile.update({
        where: { userId },
        data: { availability },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });
      
      return updatedProfile;
    } catch (error) {
      console.error('Error in updateAvailability:', error);
      throw error;
    }
  }
  
  static async getTutorBookings(tutorId: string) {
    try {
      const bookings = await prisma.booking.findMany({
        where: { tutorId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            }
          },
          review: true,
        },
        orderBy: { date: 'desc' }
      });
      
      const now = new Date();
      const upcoming = bookings.filter(booking => 
        new Date(booking.date) > now && booking.status === 'CONFIRMED'
      );
      const past = bookings.filter(booking => 
        new Date(booking.date) <= now || booking.status !== 'CONFIRMED'
      );
      
      return {
        all: bookings,
        upcoming,
        past,
        total: bookings.length,
        completed: bookings.filter(b => b.status === 'COMPLETED').length,
        cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
      };
    } catch (error) {
      console.error('Error in getTutorBookings:', error);
      throw error;
    }
  }
  
  static async getTutorStats(tutorId: string): Promise<TutorStats> {
    try {
      const [profile, bookings, reviews] = await Promise.all([
        prisma.tutorProfile.findUnique({
          where: { userId: tutorId },
        }),
        prisma.booking.findMany({
          where: { tutorId },
        }),
        prisma.review.findMany({
          where: { tutorId },
        }),
      ]);
      
      const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
      const totalEarnings = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;
      
      return {
        totalBookings: bookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length,
        totalEarnings,
        averageRating,
        totalReviews: reviews.length,
        totalStudents: new Set(bookings.map(b => b.studentId)).size,
        profile: {
          title: profile?.title || null,
          hourlyRate: profile?.hourlyRate || null,
          rating: profile?.rating || null,
          totalReviews: profile?.totalReviews || null,
        }
      };
    } catch (error) {
      console.error('Error in getTutorStats:', error);
      throw error;
    }
  }
}