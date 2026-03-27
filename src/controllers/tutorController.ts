import { Request, Response } from 'express';
import prisma from '../config/database';
import { TutorService } from '../services/tutorService';
import { AuthRequest } from '../types';

export class TutorController {

  static async getAllTutors(req: Request, res: Response) {
    try {
      const filters = {
        subject: req.query.subject as string | undefined,
        minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const tutors = await TutorService.getAllTutors(filters);

      res.json({
        success: true,
        data: tutors,
        count: tutors.length,
      });

    } catch (error: any) {
      console.error('Error in getAllTutors:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch tutors',
      });
    }
  }

  static async getTutorById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Tutor ID is required',
        });
      }

      const tutor = await TutorService.getTutorById(id);

      res.json({
        success: true,
        data: tutor,
      });

    } catch (error: any) {
      if (error.message === 'Tutor not found') {
        return res.status(404).json({
          success: false,
          message: 'Tutor not found',
        });
      }
      
      if (error.message === 'Tutor account is inactive') {
        return res.status(403).json({
          success: false,
          message: 'Tutor account is inactive',
        });
      }

      console.error('Error in getTutorById:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch tutor',
      });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const data = req.body;

      if (data.hourlyRate !== undefined && data.hourlyRate < 0) {
        return res.status(400).json({
          success: false,
          message: 'Hourly rate cannot be negative',
        });
      }
      
      if (data.experience !== undefined && data.experience < 0) {
        return res.status(400).json({
          success: false,
          message: 'Experience cannot be negative',
        });
      }

      const profile = await TutorService.updateProfile(userId, data);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: profile,
      });

    } catch (error: any) {
      console.error('Error in updateProfile:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update profile',
      });
    }
  }

  static async updateAvailability(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { availability } = req.body;

      if (!availability || typeof availability !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid availability format. Availability must be an object.',
        });
      }

      const profile = await TutorService.updateAvailability(userId, availability);

      res.json({
        success: true,
        message: 'Availability updated successfully',
        data: profile,
      });

    } catch (error: any) {
      console.error('Error in updateAvailability:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update availability',
      });
    }
  }

  static async getMyBookings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const bookings = await TutorService.getTutorBookings(userId);

      res.json({
        success: true,
        data: bookings,
      });

    } catch (error: any) {
      console.error('Error in getMyBookings:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch bookings',
      });
    }
  }

  static async getMyStats(req: AuthRequest, res: Response) {
    try {
      const stats = await TutorService.getTutorStats(req.user!.id);

      res.json({
        success: true,
        data: stats,
      });

    } catch (error: any) {
      console.error('Error in getMyStats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch stats',
      });
    }
  }

  static async getFeaturedTutors(req: Request, res: Response) {
    try {
      const limit = Number(req.query.limit) || 6;

      const tutors = await prisma.tutorProfile.findMany({
        where: {
          rating: { gte: 4.5 },
          user: { isActive: true },
        },
        include: {
          user: {
            select: { 
              id: true, 
              name: true, 
              avatar: true,
              email: true 
            },
          },
        },
        take: limit,
        orderBy: { rating: 'desc' },
      });

      res.json({
        success: true,
        data: tutors,
        count: tutors.length,
      });

    } catch (error: any) {
      console.error('Error in getFeaturedTutors:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch featured tutors',
      });
    }
  }

  static async getTopRated(req: Request, res: Response) {
    try {
      const limit = Number(req.query.limit) || 10;

      const tutors = await prisma.tutorProfile.findMany({
        where: {
          rating: { gt: 0 },
          user: { isActive: true },
        },
        include: {
          user: {
            select: { 
              id: true, 
              name: true, 
              avatar: true,
              email: true 
            },
          },
        },
        take: limit,
        orderBy: { rating: 'desc' },
      });

      res.json({
        success: true,
        data: tutors,
        count: tutors.length,
      });

    } catch (error: any) {
      console.error('Error in getTopRated:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch top rated tutors',
      });
    }
  }

  static async searchBySubject(req: Request, res: Response) {
    try {
      const subject = String(req.params.subject);
      
      if (!subject || subject.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Subject is required',
        });
      }

      const tutors = await prisma.tutorProfile.findMany({
        where: {
          subjects: {
            has: subject,
          },
          user: {
            isActive: true,
          },
        },
        include: {
          user: {
            select: { 
              id: true, 
              name: true, 
              avatar: true,
              email: true 
            },
          },
        },
        orderBy: { rating: 'desc' },
      });

      res.json({
        success: true,
        data: tutors,
        count: tutors.length,
        subject: subject,
      });

    } catch (error: any) {
      console.error('Error in searchBySubject:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to search tutors',
      });
    }
  }

  static async getMyAvailability(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      const tutor = await prisma.tutorProfile.findUnique({
        where: { userId },
        select: {
          availability: true,
          title: true,
          hourlyRate: true,
          subjects: true,
        }
      });
      
      if (!tutor) {
        return res.status(404).json({
          success: false,
          message: 'Tutor profile not found',
        });
      }
      
      res.json({
        success: true,
        data: {
          availability: tutor.availability || {},
          title: tutor.title,
          hourlyRate: tutor.hourlyRate,
          subjects: tutor.subjects,
        }
      });
      
    } catch (error: any) {
      console.error('Error in getMyAvailability:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch availability',
      });
    }
  }
}