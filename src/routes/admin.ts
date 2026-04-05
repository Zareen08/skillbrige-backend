import { Router } from 'express';
import { AdminController } from '../controllers/adminController';

const router = Router();

// Dashboard & Stats
router.get('/dashboard/stats', AdminController.getDashboardStats);
router.get('/analytics', AdminController.getPlatformAnalytics);
router.get('/health', AdminController.getSystemHealth);

// User Management
router.get('/users', AdminController.getAllUsers);
router.get('/users/:id', AdminController.getUserDetails);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.delete('/users/:id', AdminController.deleteUser);

// Booking Management
router.get('/bookings', AdminController.getAllBookings);
router.get('/bookings/:id', AdminController.getBookingDetails);
router.post('/bookings/:id/cancel', AdminController.cancelBooking);

// Category Management
router.get('/categories', AdminController.getAllCategories);
router.post('/categories', AdminController.createCategory);
router.put('/categories/:id', AdminController.updateCategory);
router.delete('/categories/:id', AdminController.deleteCategory);

export default router;