import { Response } from 'express';
import { ReviewService } from '../services/reviewService';
import { AuthRequest } from '../middleware/auth';

export class ReviewController {

  // CREATE REVIEW
  static async createReview(req: AuthRequest, res: Response) {
    try {
      const { rating, comment, tutorId, bookingId } = req.body;

      //  Basic validation
      if (!rating || !tutorId || !bookingId) {
        return res.status(400).json({
          message: 'rating, tutorId and bookingId are required',
        });
      }

      const review = await ReviewService.createReview({
        rating: Number(rating),
        comment: comment || '',
        studentId: req.user!.id,
        tutorId: String(tutorId),
        bookingId: String(bookingId),
      });

      return res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: review,
      });

    } catch (error: any) {
      console.error('Create review error:', error);

      if (
        error.message.includes('not found') ||
        error.message.includes('not completed')
      ) {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }

      return res.status(500).json({
        message: error.message || 'Error creating review',
      });
    }
  }

  // GET REVIEWS BY TUTOR
  static async getTutorReviews(req: AuthRequest, res: Response) {
    try {
      const { tutorId } = req.params;

      if (!tutorId) {
        return res.status(400).json({
          message: 'Tutor ID is required',
        });
      }

      const reviews = await ReviewService.getTutorReviews(String(tutorId));

      return res.json({
        success: true,
        data: reviews,
        count: reviews.length,
      });

    } catch (error: any) {
      console.error('Get reviews error:', error);

      return res.status(500).json({
        message: error.message || 'Error fetching reviews',
      });
    }
  }

  // DELETE REVIEW
  static async deleteReview(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          message: 'Review ID is required',
        });
      }

      const result = await ReviewService.deleteReview(
        String(id),
        req.user!.id,
        req.user!.role
      );

      return res.json({
        success: true,
        ...result,
      });

    } catch (error: any) {
      console.error('Delete review error:', error);

      if (error.message === 'Review not found') {
        return res.status(404).json({ message: error.message });
      }

      if (error.message === 'Forbidden') {
        return res.status(403).json({ message: error.message });
      }

      return res.status(500).json({
        message: error.message || 'Error deleting review',
      });
    }
  }
}