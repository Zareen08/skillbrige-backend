import { Request } from 'express';
import { JwtPayload } from '../utils/jwt';


export interface AuthRequest extends Request {
  user?: JwtPayload;
}


export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}


export interface TutorFilters {
  subject?: string;
  minRating?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'rating' | 'hourlyRate' | 'experience' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BookingFilters {
  status?: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export interface UserFilters {
  role?: 'STUDENT' | 'TUTOR' | 'ADMIN';
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ReviewFilters {
  rating?: number;
  minRating?: number;
  maxRating?: number;
  page?: number;
  limit?: number;
}


export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TUTOR' | 'ADMIN';
  isActive: boolean;
  avatar?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile {
  id: string;
  userId: string;
  phone?: string | null;
  education?: string | null;
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TutorProfile {
  id: string;
  userId: string;
  title: string;
  bio: string;
  subjects: string[];
  hourlyRate: number;
  experience: number;
  education: string;
  availability: any;
  rating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithProfile extends User {
  studentProfile?: StudentProfile | null;
  tutorProfile?: TutorProfile | null;
}


export interface Review {
  id: string;
  rating: number;
  comment: string;
  studentId: string;
  tutorId: string;
  bookingId: string;
  createdAt: Date;
}

export interface ReviewWithStudent extends Review {
  student: {
    id: string;
    name: string;
    avatar: string | null;
    email?: string;
  };
}

export interface ReviewWithBooking extends Review {
  booking?: {
    date: Date;
    duration: number;
  };
}

export interface ReviewWithDetails extends Review {
  student: {
    id: string;
    name: string;
    avatar: string | null;
    email: string;
  };
  booking?: {
    date: Date;
    duration: number;
  };
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ReviewPaginated {
  reviews: ReviewWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: ReviewStats;
}


export interface TutorWithDetails extends TutorProfile {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    isActive: boolean;
  };
  reviews?: ReviewWithStudent[];
  stats?: {
    totalCompletedSessions: number;
    totalEarnings: number;
  };
}

export interface TutorStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  totalStudents: number;
  profile: {
    title: string | null;
    hourlyRate: number | null;
    rating: number | null;
    totalReviews: number | null;
  };
}


export interface Booking {
  id: string;
  studentId: string;
  tutorId: string;
  date: Date;
  duration: number;
  totalAmount: number;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  isReviewed: boolean;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingWithDetails extends Booking {
  student: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  tutor: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    tutorProfile?: {
      title: string | null;
      rating: number | null;
    } | null;
  };
  review?: Review | null;
}

export interface BookingGrouped {
  upcoming: BookingWithDetails[];
  past: BookingWithDetails[];
  all: BookingWithDetails[];
  totals: {
    total: number;
    upcoming: number;
    past: number;
    completed: number;
    cancelled: number;
  };
}


export interface Category {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  createdAt: Date;
}


export interface AdminStats {
  totalUsers: number;
  totalTutors: number;
  totalStudents: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  recentBookings: Array<{
    id: string;
    student: { name: string };
    tutor: { name: string };
    totalAmount: number;
    status: string;
    createdAt: Date;
  }>;
}

export interface TutorDashboardStats {
  totalStudents: number;
  totalSessions: number;
  totalHours: number;
  totalEarnings: number;
  averageRating: number;
  upcomingSessions: number;
  completedSessions: number;
  cancellationRate: number;
}

export interface StudentDashboardStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalSpent: number;
  averageRating: number;
  subjectsStudied: string[];
  favoriteTutors: string[];
}


export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: 'STUDENT' | 'TUTOR';
  phone?: string;
  education?: string;
  interests?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateBookingInput {
  tutorId: string;
  date: string;
  duration: number;
  notes?: string;
}

export interface CreateReviewInput {
  rating: number;
  comment: string;
  bookingId: string;
}

export interface UpdateTutorProfileInput {
  title?: string;
  bio?: string;
  subjects?: string[];
  hourlyRate?: number;
  experience?: number;
  education?: string;
  availability?: any;
}

export interface UpdateUserProfileInput {
  name?: string;
  avatar?: string;
  phone?: string;
  education?: string;
  interests?: string[];
}


export class FilterBuilder {
  static buildTutorWhere(filters: TutorFilters): any {
    const where: any = {};
    
    if (filters.subject) {
      where.subjects = { has: filters.subject };
    }
    
    if (filters.minRating !== undefined && filters.minRating !== null) {
      where.rating = { gte: filters.minRating };
    }
    
    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      where.hourlyRate = { lte: filters.maxPrice };
    }
    
    return where;
  }
  
  static buildTutorOrderBy(filters: TutorFilters): any {
    const sortBy = filters.sortBy || 'rating';
    const sortOrder = filters.sortOrder || 'desc';
    return { [sortBy]: sortOrder };
  }
  
  static buildBookingWhere(filters: BookingFilters, userId?: string, role?: string): any {
    const where: any = {};
    
    if (userId && role) {
      if (role === 'STUDENT') {
        where.studentId = userId;
      } else if (role === 'TUTOR') {
        where.tutorId = userId;
      }
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }
    
    if (filters.minAmount !== undefined && filters.minAmount !== null) {
      where.totalAmount = { gte: filters.minAmount };
    }
    
    if (filters.maxAmount !== undefined && filters.maxAmount !== null) {
      where.totalAmount = { ...where.totalAmount, lte: filters.maxAmount };
    }
    
    return where;
  }
  
  static buildUserWhere(filters: UserFilters): any {
    const where: any = {};
    
    if (filters.role) {
      where.role = filters.role;
    }
    
    if (filters.isActive !== undefined && filters.isActive !== null) {
      where.isActive = filters.isActive;
    }
    
    if (filters.search && filters.search.trim()) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    return where;
  }
  
  static buildReviewWhere(filters: ReviewFilters, tutorId?: string): any {
    const where: any = {};
    
    if (tutorId) {
      where.tutorId = tutorId;
    }
    
    if (filters.rating) {
      where.rating = filters.rating;
    }
    
    if (filters.minRating !== undefined && filters.minRating !== null) {
      where.rating = { gte: filters.minRating };
    }
    
    if (filters.maxRating !== undefined && filters.maxRating !== null) {
      where.rating = { ...where.rating, lte: filters.maxRating };
    }
    
    return where;
  }
  
  static getPagination(page: number = 1, limit: number = 10): { skip: number; take: number } {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    return {
      skip: (validPage - 1) * validLimit,
      take: validLimit,
    };
  }
  
  static getPaginationResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}


export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}