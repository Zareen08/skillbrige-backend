import prisma from '../config/database';

export class BookingService {
  static async createBooking(data: {
    studentId: string;
    tutorId: string;
    date: Date;
    duration: number;
    notes?: string;
  }) {
    try {
      // Get tutor details
      const tutor = await prisma.user.findUnique({
        where: { id: data.tutorId },
        include: { tutorProfile: true }
      });

      if (!tutor || tutor.role !== 'TUTOR') {
        throw new Error('Tutor not found');
      }

      if (!tutor.isActive) {
        throw new Error('Tutor account is inactive');
      }

      if (!tutor.tutorProfile) {
        throw new Error('Tutor profile not found');
      }

      const newStart = data.date;
      const newEnd   = new Date(newStart.getTime() + data.duration * 60_000);

      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          tutorId: data.tutorId,
          status: { not: 'CANCELLED' },
          date: { lt: newEnd },
          AND: [
            {
              date: {
                gte: new Date(newStart.getTime() - 8 * 60 * 60_000), 
              },
            },
          ],
        },
        include: { id: true, date: true, duration: true } as any,
      });

      // Secondary precise check
      if (conflictingBooking) {
        const existingEnd = new Date(
          (conflictingBooking as any).date.getTime() +
          (conflictingBooking as any).duration * 60_000
        );
        if (existingEnd > newStart) {
          throw new Error('Tutor is already booked at this time');
        }
      }

      // Calculate total amount
      const totalAmount = (tutor.tutorProfile.hourlyRate * data.duration) / 60;

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          studentId: data.studentId,
          tutorId: data.tutorId,
          date: data.date,
          duration: data.duration,
          totalAmount,
          notes: data.notes,
          status: 'CONFIRMED',
          isReviewed: false,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              tutorProfile: {
                select: {
                  id: true,
                  title: true,
                  hourlyRate: true
                }
              }
            }
          }
        }
      });

      return booking;
    } catch (error: any) {
      console.error('Error in createBooking:', error);
      throw error;
    }
  }

  static async getUserBookings(userId: string, role: string) {
    try {
      const where: any = {};

      if (role === 'STUDENT') {
        where.studentId = userId;
      } else if (role === 'TUTOR') {
        where.tutorId = userId;
      } else {
        throw new Error('Invalid role');
      }

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              tutorProfile: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          },
          review: true,
        },
        orderBy: { date: 'desc' }
      });

      return bookings;
    } catch (error: any) {
      console.error('Error in getUserBookings:', error);
      throw error;
    }
  }

  static async getBookingById(bookingId: string, userId: string, role: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              studentProfile: true
            }
          },
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              tutorProfile: true
            }
          },
          review: true,
        }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check if user has access
      if (role !== 'ADMIN' && booking.studentId !== userId && booking.tutorId !== userId) {
        throw new Error('You do not have permission to view this booking');
      }

      return booking;
    } catch (error: any) {
      console.error('Error in getBookingById:', error);
      throw error;
    }
  }

  static async updateStatus(bookingId: string, newStatus: string, userId: string, role: string) {
    try {
      // Validate status
      const validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Check if booking exists
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          student: true,
          tutor: {
            include: { tutorProfile: true }
          }
        }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check permissions
      if (role === 'STUDENT' && booking.studentId !== userId) {
        throw new Error('You can only update your own bookings');
      }

      if (role === 'TUTOR' && booking.tutorId !== userId) {
        throw new Error('You can only update bookings for your sessions');
      }

      // Prevent invalid status 
      if (booking.status === 'COMPLETED') {
        throw new Error('Cannot update a completed booking');
      }

      if (booking.status === 'CANCELLED') {
        throw new Error('Cannot update a cancelled booking');
      }

      // Update booking
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: newStatus as any,
          updatedAt: new Date()
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              tutorProfile: {
                select: {
                  id: true,
                  title: true,
                  hourlyRate: true
                }
              }
            }
          },
          review: true,
        }
      });

      if (newStatus === 'COMPLETED') {
        await this.updateTutorRating(booking.tutorId);
      }

      return updatedBooking;
    } catch (error: any) {
      console.error('Error in updateStatus:', error);
      throw error;
    }
  }

  // Delegates to ReviewService 
  static async updateTutorRating(tutorId: string) {
    const { ReviewService } = await import('./reviewService');
    await ReviewService.updateTutorRating(tutorId);
  }

  static async cancelBooking(bookingId: string, userId: string, role: string, reason?: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check permissions
      if (role === 'STUDENT' && booking.studentId !== userId) {
        throw new Error('You can only cancel your own bookings');
      }

      if (role === 'TUTOR' && booking.tutorId !== userId) {
        throw new Error('You can only cancel bookings for your sessions');
      }

      if (booking.status === 'COMPLETED') {
        throw new Error('Cannot cancel a completed booking');
      }

      if (booking.status === 'CANCELLED') {
        throw new Error('Booking is already cancelled');
      }

      const cancelledBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          notes: reason ? `${booking.notes || ''}\nCancellation reason: ${reason}` : booking.notes,
          updatedAt: new Date()
        }
      });

      return cancelledBooking;
    } catch (error: any) {
      console.error('Error in cancelBooking:', error);
      throw error;
    }
  }

  static async getUpcomingBookings(userId: string, role: string) {
    try {
      const where: any = {
        date: { gte: new Date() },
        status: 'CONFIRMED'
      };

      if (role === 'STUDENT') {
        where.studentId = userId;
      } else if (role === 'TUTOR') {
        where.tutorId = userId;
      } else {
        throw new Error('Invalid role');
      }

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              tutorProfile: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          },
          review: true,
        },
        orderBy: { date: 'asc' }
      });

      return bookings;
    } catch (error: any) {
      console.error('Error in getUpcomingBookings:', error);
      throw error;
    }
  }

  static async getPastBookings(userId: string, role: string) {
    try {
      const where: any = {
        date: { lt: new Date() },
        OR: [
          { status: 'COMPLETED' },
          { status: 'CANCELLED' }
        ]
      };

      if (role === 'STUDENT') {
        where.studentId = userId;
      } else if (role === 'TUTOR') {
        where.tutorId = userId;
      } else {
        throw new Error('Invalid role');
      }

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              tutorProfile: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          },
          review: true,
        },
        orderBy: { date: 'desc' }
      });

      return bookings;
    } catch (error: any) {
      console.error('Error in getPastBookings:', error);
      throw error;
    }
  }
}