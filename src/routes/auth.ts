import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', AuthController.register);

// Login
router.post('/login', AuthController.login);

// Get current user
router.get('/me', authMiddleware, AuthController.getMe);

export default router;