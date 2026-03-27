import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  id: string;  
  email: string;
  name: string;
  role: string;
}

export const generateToken = (payload: JwtPayload, expiresIn: string = JWT_EXPIRES_IN): string => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
  } catch (err) {
    console.error('JWT sign error:', err);
    throw new Error('Failed to generate JWT token');
  }
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (err) {
    console.error('JWT verify error:', err);
    throw new Error('Invalid or expired token');
  }
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded;
  } catch (err) {
    console.error('JWT decode error:', err);
    return null;
  }
};