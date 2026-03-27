import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken, JwtPayload } from '../utils/jwt';

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    name: string;
    role: 'STUDENT' | 'TUTOR';
    phone?: string;
    education?: string;
    interests?: string[];
  }) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Hash password
    const hashedPassword = await hashPassword(data.password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
      }
    });
    
    // Create role-specific profile
    if (data.role === 'STUDENT') {
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          phone: data.phone,
          education: data.education,
          interests: data.interests || [],
        }
      });
    } else if (data.role === 'TUTOR') {
      await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          title: '',
          bio: '',
          subjects: [],
          hourlyRate: 0,
          experience: 0,
          education: '',
        }
      });
    }
    
    // Generate JWT payload
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    
    // Generate token
    const token = generateToken(payload);
    
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    };
  }
  
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        tutorProfile: true,
      }
    });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    if (!user.isActive) {
      throw new Error('Account is banned');
    }
    
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    
    // Generate JWT payload
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    
    // Generate token
    const token = generateToken(payload);
    
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        profile: user.studentProfile || user.tutorProfile,
      }
    };
  }
  
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        tutorProfile: true,
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      profile: user.studentProfile || user.tutorProfile,
    };
  }
}