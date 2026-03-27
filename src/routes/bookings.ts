import { Router } from 'express';
import { BookingController } from '../controllers/bookingController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { validate, bookingValidation } from '../utils/validator';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  roleMiddleware('STUDENT'),
  bookingValidation,
  validate,
  BookingController.createBooking
);

router.get('/', BookingController.getUserBookings);

router.get('/upcoming', BookingController.getUpcomingBookings);

router.get('/past', BookingController.getPastBookings);

router.get('/stats', BookingController.getBookingStats);

router.post(
  '/check-availability',
  roleMiddleware('STUDENT'),
  BookingController.checkAvailability
);

router.get('/:id', BookingController.getBookingById);

router.patch('/:id/status', BookingController.updateStatus);

router.post('/:id/cancel', BookingController.cancelBooking);

export default router;