import prisma from '../config/database';

export class AdminService {
  // Dashboard Statistics
  
  static async getDashboardStats() {
    try {
      // Get user statistics
      const totalUsers = await prisma.user.count();
      const totalTutors = await prisma.user.count({ where: { role: 'TUTOR' } });
      const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
      const activeUsers = await prisma.user.count({ where: { isActive: true } });
      const bannedUsers = await prisma.user.count({ where: { isActive: false } });
      
      // Get booking statistics
      const totalBookings = await prisma.booking.count();
      const completedBookings = await prisma.booking.count({ where: { status: 'COMPLETED' } });
      const cancelledBookings = await prisma.booking.count({ where: { status: 'CANCELLED' } });
      const pendingBookings = await prisma.booking.count({ where: { status: 'CONFIRMED' } });
      
      // Get revenue statistics
      const totalRevenue = await prisma.booking.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true },
      });
      
      // Get monthly revenue for chart
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const monthlyRevenue = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          SUM("totalAmount") as revenue,
          COUNT(*) as bookings
        FROM "Booking"
        WHERE status = 'COMPLETED'
          AND "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      `;
      
      // Get recent activities
      const recentBookings = await prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { name: true, email: true, avatar: true } },
          tutor: { select: { name: true, email: true, avatar: true } },
        },
      });
      
      const recentUsers = await prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          studentProfile: true,
          tutorProfile: true,
        },
      });
      
      // Get platform growth
      const usersLastWeek = await prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });
      
      const usersLastMonth = await prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });
      
      return {
        users: {
          total: totalUsers,
          tutors: totalTutors,
          students: totalStudents,
          active: activeUsers,
          banned: bannedUsers,
          growth: {
            lastWeek: usersLastWeek,
            lastMonth: usersLastMonth,
          },
        },
        bookings: {
          total: totalBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
          pending: pendingBookings,
          completionRate: totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(2) : 0,
        },
        revenue: {
          total: totalRevenue._sum.totalAmount || 0,
          monthly: monthlyRevenue,
        },
        recentActivities: {
          bookings: recentBookings,
          users: recentUsers,
        },
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }
  
  // User Management
  
  static async getAllUsers(filters: {
    role?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { 
      role, search, isActive, 
      page = 1, limit = 10, 
      sortBy = 'createdAt', sortOrder = 'desc' 
    } = filters;
    
    const where: any = {};
    
    if (role && role !== 'ALL') {
      where.role = role;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          studentProfile: true,
          tutorProfile: true,
          studentBookings: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          tutorBookings: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);
    
    // Add additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user: any) => {
        let stats = {};
        
        if (user.role === 'STUDENT') {
          const completedBookings = user.studentBookings.filter((b: any) => b.status === 'COMPLETED');
          stats = {
            totalBookings: user.studentBookings.length,
            completedBookings: completedBookings.length,
            totalSpent: completedBookings.reduce((sum: number, b: any) => sum + b.totalAmount, 0),
          };
        } else if (user.role === 'TUTOR') {
          const completedBookings = user.tutorBookings.filter((b: any) => b.status === 'COMPLETED');
          stats = {
            totalBookings: user.tutorBookings.length,
            completedBookings: completedBookings.length,
            totalEarnings: completedBookings.reduce((sum: number, b: any) => sum + b.totalAmount, 0),
            rating: user.tutorProfile?.rating || 0,
          };
        }
        
        return {
          ...user,
          stats,
        };
      })
    );
    
    return {
      users: usersWithStats,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }
  
  static async getUserDetails(userId: string) {
    const user: any = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        tutorProfile: true,
        studentBookings: {
          include: {
            tutor: {
              select: {
                name: true,
                email: true,
                avatar: true,
                tutorProfile: true,
              },
            },
            review: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        tutorBookings: {
          include: {
            student: {
              select: {
                name: true,
                email: true,
                avatar: true,
                studentProfile: true,
              },
            },
            review: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        studentReviews: {
          include: {
            tutor: {
              select: { name: true, avatar: true },
            },
            booking: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        tutorReviews: {
          include: {
            student: {
              select: { name: true, avatar: true },
            },
            booking: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Calculate comprehensive stats
    let detailedStats = {};
    
    if (user.role === 'STUDENT') {
      const completedBookings = user.studentBookings.filter((b: any) => b.status === 'COMPLETED');
      detailedStats = {
        totalBookings: user.studentBookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: user.studentBookings.filter((b: any) => b.status === 'CANCELLED').length,
        totalSpent: completedBookings.reduce((sum: number, b: any) => sum + b.totalAmount, 0),
        averageRating: user.studentReviews.length > 0
          ? user.studentReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / user.studentReviews.length
          : 0,
        favoriteSubjects: user.studentProfile?.interests || [],
        learningProgress: {
          totalHours: completedBookings.reduce((sum: number, b: any) => sum + b.duration, 0) / 60,
          subjectsLearned: [...new Set(completedBookings.map((b: any) => b.tutor.tutorProfile?.subjects || []).flat())],
        },
      };
    } else if (user.role === 'TUTOR') {
      const completedBookings = user.tutorBookings.filter((b: any) => b.status === 'COMPLETED');
      detailedStats = {
        totalBookings: user.tutorBookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: user.tutorBookings.filter((b: any) => b.status === 'CANCELLED').length,
        totalEarnings: completedBookings.reduce((sum: number, b: any) => sum + b.totalAmount, 0),
        totalHoursTaught: completedBookings.reduce((sum: number, b: any) => sum + b.duration, 0) / 60,
        averageRating: user.tutorProfile?.rating || 0,
        totalReviews: user.tutorProfile?.totalReviews || 0,
        subjects: user.tutorProfile?.subjects || [],
        hourlyRate: user.tutorProfile?.hourlyRate || 0,
        availability: user.tutorProfile?.availability || {},
      };
    }
    
    return {
      ...user,
      detailedStats,
    };
  }
  
  static async updateUserStatus(userId: string, isActive: boolean, reason?: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      include: {
        studentProfile: true,
        tutorProfile: true,
      },
    });
    
    // Log the action 
    console.log(`Admin action: User ${userId} ${isActive ? 'activated' : 'banned'}. Reason: ${reason || 'No reason provided'}`);
    
    return user;
  }
  
  static async deleteUser(userId: string) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Delete user 
    await prisma.user.delete({
      where: { id: userId },
    });
    
    return { message: 'User deleted successfully' };
  }
  
  // Booking Management
  
  static async getAllBookings(filters: {
    status?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { 
      status, search, startDate, endDate,
      page = 1, limit = 10,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = filters;
    
    const where: any = {};
    
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }
    
    if (search) {
      where.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { tutor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          student: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          tutor: {
            select: { id: true, name: true, email: true, avatar: true, tutorProfile: true },
          },
          review: true,
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.booking.count({ where }),
    ]);
    
    // Calculate summary statistics
    const summary = {
      totalAmount: bookings.reduce((sum: number, b: any) => sum + b.totalAmount, 0),
      averageAmount: bookings.length > 0 ? bookings.reduce((sum: number, b: any) => sum + b.totalAmount, 0) / bookings.length : 0,
      totalDuration: bookings.reduce((sum: number, b: any) => sum + b.duration, 0),
    };
    
    return {
      bookings,
      summary,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }
  
  static async getBookingDetails(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: {
          include: { studentProfile: true },
        },
        tutor: {
          include: { tutorProfile: true },
        },
        review: true,
      },
    });
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    return booking;
  }
  
  static async cancelBooking(bookingId: string, reason: string) {
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        notes: reason,
      },
      include: {
        student: true,
        tutor: true,
      },
    });
    
    return booking;
  }
  
  // Category Management
  
  static async getAllCategories() {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    
    // Get tutor count for each category
    const categoriesWithStats = await Promise.all(
      categories.map(async (category: any) => {
        const tutorCount = await prisma.tutorProfile.count({
          where: {
            subjects: { has: category.name },
          },
        });
        
        return {
          ...category,
          tutorCount,
        };
      })
    );
    
    return categoriesWithStats;
  }
  
  static async createCategory(data: {
    name: string;
    description?: string;
    icon?: string;
  }) {
    const existingCategory = await prisma.category.findUnique({
      where: { name: data.name },
    });
    
    if (existingCategory) {
      throw new Error('Category already exists');
    }
    
    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon,
      },
    });
    
    return category;
  }
  
  static async updateCategory(categoryId: string, data: {
    name?: string;
    description?: string;
    icon?: string;
  }) {
    const category = await prisma.category.update({
      where: { id: categoryId },
      data,
    });
    
    return category;
  }
  
  static async deleteCategory(categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    await prisma.category.delete({
      where: { id: categoryId },
    });
    
    return { message: 'Category deleted successfully' };
  }
  
  // Platform Analytics
  
  static async getPlatformAnalytics(startDate: Date, endDate: Date) {
    // User growth over time
    const userGrowth = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*) as newUsers,
        COUNT(CASE WHEN role = 'STUDENT' THEN 1 END) as newStudents,
        COUNT(CASE WHEN role = 'TUTOR' THEN 1 END) as newTutors
      FROM "User"
      WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;
    
    // Booking trends
    const bookingTrends = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*) as totalBookings,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completedBookings,
        SUM("totalAmount") as revenue
      FROM "Booking"
      WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;
    
    // Popular subjects
    const popularSubjects = await prisma.$queryRaw`
      SELECT 
        unnest(subjects) as subject,
        COUNT(*) as tutorCount,
        AVG(rating) as averageRating
      FROM "TutorProfile"
      GROUP BY subject
      ORDER BY tutorCount DESC
      LIMIT 10
    `;
    
    // Tutor performance
    const topTutors = await prisma.tutorProfile.findMany({
      where: {
        rating: { gt: 0 },
      },
      include: {
        user: {
          select: { name: true, email: true, avatar: true },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { totalReviews: 'desc' },
      ],
      take: 10,
    });
    
    return {
      userGrowth,
      bookingTrends,
      popularSubjects,
      topTutors,
      dateRange: { startDate, endDate },
    };
  }
  
  // System Health
  
  static async getSystemHealth() {
    // Get database connection status
    let databaseStatus = 'connected';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      databaseStatus = 'disconnected';
    }
    
    // Get counts for various entities
    const [
      totalUsers,
      totalBookings,
      totalReviews,
      activeUsersToday,
      bookingsToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.booking.count(),
      prisma.review.count(),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: databaseStatus,
      metrics: {
        totalUsers,
        totalBookings,
        totalReviews,
        activeUsersToday,
        bookingsToday,
      },
    };
  }
}