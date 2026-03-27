import { Response } from 'express';
import prisma from '../config/database';
import { BookingService } from '../services/bookingService';
import { AuthRequest } from '../middleware/auth';

export class BookingController {

  // Create Booking
  static async createBooking(req: AuthRequest, res: Response) {
    try {
      const { tutorId, date, duration, notes } = req.body;

      if (!tutorId || !date || !duration) {
        return res.status(400).json({
          message: 'tutorId, date, duration are required',
        });
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      const booking = await BookingService.createBooking({
        studentId: req.user!.id,
        tutorId: String(tutorId),
        date: parsedDate,
        duration: Number(duration),
        notes,
      });

      return res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking,
      });
    } catch (error: any) {
      console.error('Create booking error:', error);

      if (
        error.message === 'Tutor not found' ||
        error.message === 'Tutor profile not found'
      ) {
        return res.status(404).json({ message: error.message });
      }

      if (error.message === 'Tutor account is inactive') {
        return res.status(403).json({ message: error.message });
      }

      if (error.message === 'Tutor is already booked at this time') {
        return res.status(409).json({ message: error.message });
      }

      return res.status(500).json({
        message: error.message || 'Error creating booking',
      });
    }
  }

  // Get User Bookings
  static async getUserBookings(req: AuthRequest, res: Response) {
    try {
      const status = req.query.status as string;
      const type = req.query.type as string;
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);

      let bookings: any[] = [];

      if (type === 'upcoming') {
        bookings = await BookingService.getUpcomingBookings(
          req.user!.id,
          req.user!.role
        );
      } else if (type === 'past') {
        bookings = await BookingService.getPastBookings(
          req.user!.id,
          req.user!.role
        );
      } else {
        bookings = await BookingService.getUserBookings(
          req.user!.id,
          req.user!.role
        );
      }

      if (status && status !== 'ALL') {
        bookings = bookings.filter(b => b.status === status);
      }

      const start = (page - 1) * limit;
      const paginated = bookings.slice(start, start + limit);

      return res.json({
        success: true,
        data: paginated,
        pagination: {
          total: bookings.length,
          page,
          limit,
          totalPages: Math.ceil(bookings.length / limit),
        },
      });
    } catch (error: any) {
      console.error('Get bookings error:', error);
      return res.status(500).json({
        message: error.message || 'Error fetching bookings',
      });
    }
  }

  // Get Booking By ID
  static async getBookingById(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id;

      if (!id) {
        return res.status(400).json({ message: 'Booking ID is required' });
      }

      const booking = await BookingService.getBookingById(
        String(id),
        req.user!.id,
        req.user!.role
      );

      return res.json({
        success: true,
        data: booking,
      });
    } catch (error: any) {
      console.error('Get booking error:', error);

      if (error.message === 'Booking not found') {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes('permission')) {
        return res.status(403).json({ message: error.message });
      }

      return res.status(500).json({
        message: error.message || 'Error fetching booking',
      });
    }
  }

  // Update Status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id;
      const status = req.body.status as string;

      if (!id || !status) {
        return res.status(400).json({
          message: 'Booking ID and status are required',
        });
      }

      const booking = await BookingService.updateStatus(
        String(id),
        status,
        req.user!.id,
        req.user!.role
      );

      return res.json({
        success: true,
        message: `Booking ${status.toLowerCase()} successfully`,
        data: booking,
      });
    } catch (error: any) {
      console.error('Update status error:', error);

      if (error.message === 'Booking not found') {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes('Invalid') || error.message.includes('Cannot')) {
        return res.status(400).json({ message: error.message });
      }

      if (error.message.includes('permission')) {
        return res.status(403).json({ message: error.message });
      }

      return res.status(500).json({
        message: error.message || 'Error updating booking',
      });
    }
  }

  // Cancel Booking
  static async cancelBooking(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id;
      const reason = req.body.reason;

      if (!id) {
        return res.status(400).json({ message: 'Booking ID is required' });
      }

      const booking = await BookingService.cancelBooking(
        String(id),
        req.user!.id,
        req.user!.role,
        reason
      );

      return res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: booking,
      });
    } catch (error: any) {
      console.error('Cancel booking error:', error);

      if (error.message === 'Booking not found') {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes('Cannot')) {
        return res.status(400).json({ message: error.message });
      }

      if (error.message.includes('permission')) {
        return res.status(403).json({ message: error.message });
      }

      return res.status(500).json({
        message: error.message || 'Error cancelling booking',
      });
    }
  }

  // Get Upcoming Bookings
  static async getUpcomingBookings(req: AuthRequest, res: Response) {
    try {
      const bookings = await BookingService.getUpcomingBookings(
        req.user!.id,
        req.user!.role
      );

      return res.json({
        success: true,
        data: bookings,
        count: bookings.length
      });
    } catch (error: any) {
      console.error('Get upcoming bookings error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching upcoming bookings',
      });
    }
  }

  // Get Past Bookings
  static async getPastBookings(req: AuthRequest, res: Response) {
    try {
      const bookings = await BookingService.getPastBookings(
        req.user!.id,
        req.user!.role
      );

      return res.json({
        success: true,
        data: bookings,
        count: bookings.length
      });
    } catch (error: any) {
      console.error('Get past bookings error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching past bookings',
      });
    }
  }

  // Get Booking Statistics
  static async getBookingStats(req: AuthRequest, res: Response) {
    try {
      const bookings = await BookingService.getUserBookings(
        req.user!.id,
        req.user!.role
      );
      
      const now = new Date();
      
      // Calculate statistics
      const stats = {
        total: bookings.length,
        upcoming: bookings.filter(b => new Date(b.date) > now && b.status === 'CONFIRMED').length,
        completed: bookings.filter(b => b.status === 'COMPLETED').length,
        cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
        totalSpent: bookings
          .filter(b => b.status === 'COMPLETED')
          .reduce((sum, b) => sum + b.totalAmount, 0),
        averageRating: 0, 
      };
      
      // Calculate average rating 
      const completedWithReviews = bookings.filter(b => b.status === 'COMPLETED' && b.review);
      if (completedWithReviews.length > 0) {
        const totalRating = completedWithReviews.reduce((sum, b) => sum + (b.review?.rating || 0), 0);
        stats.averageRating = totalRating / completedWithReviews.length;
      }
      
      return res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Get stats error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching statistics'
      });
    }
  }

  // Check Availability
  static async checkAvailability(req: AuthRequest, res: Response) {
    try {
      const { tutorId, date } = req.body;

      if (!tutorId || !date) {
        return res.status(400).json({
          message: 'tutorId and date are required',
        });
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      const existingBooking = await prisma.booking.findFirst({
        where: {
          tutorId: String(tutorId),
          date: parsedDate,
          status: {
            not: 'CANCELLED',
          },
        },
      });

      return res.json({
        success: true,
        data: {
          isAvailable: !existingBooking,
          message: existingBooking
            ? 'Tutor is already booked'
            : 'Tutor is available',
        },
      });
    } catch (error: any) {
      console.error('Availability error:', error);
      return res.status(500).json({
        message: error.message || 'Error checking availability',
      });
    }
  }
}