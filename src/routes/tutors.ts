import { Router } from 'express';
import { TutorController } from '../controllers/tutorController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

// Get all tutors with filters
router.get('/', TutorController.getAllTutors);

// Get featured tutors 
router.get('/featured', TutorController.getFeaturedTutors);

// Get top rated tutors
router.get('/top-rated', TutorController.getTopRated);

// Search tutors by subject
router.get('/search/subject/:subject', TutorController.searchBySubject);

// Get single tutor by ID 
router.get('/:id', TutorController.getTutorById);

// Tutor only routes
router.put('/profile', authMiddleware, roleMiddleware('TUTOR'), TutorController.updateProfile);
router.put('/availability', authMiddleware, roleMiddleware('TUTOR'), TutorController.updateAvailability);
router.get('/my-bookings', authMiddleware, roleMiddleware('TUTOR'), TutorController.getMyBookings);
router.get('/my-stats', authMiddleware, roleMiddleware('TUTOR'), TutorController.getMyStats);
router.get('/my-availability', authMiddleware, roleMiddleware('TUTOR'), TutorController.getMyAvailability);

export default router;