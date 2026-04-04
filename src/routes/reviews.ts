import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Create review (only student)
router.post(
  '/',
  roleMiddleware('STUDENT'),
  ReviewController.createReview
);

// Get tutor reviews
router.get('/tutor/:tutorId', ReviewController.getTutorReviews);

export default router;