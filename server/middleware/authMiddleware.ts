import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => { // Return Promise<void>
  try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
          // Use void return type after sending response
          res.status(401).json({ message: 'No authorization token provided' });
          return;
      }

      // Extract token - expected format: "Bearer <token>"
      const token = authHeader.split(' ')[1];

      if (!token) {
          // Use void return type after sending response
          res.status(401).json({ message: 'Invalid token format' });
          return;
      }

      // Verify the token using the secret from .env
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
          console.error("JWT_SECRET is not defined in environment variables.");
          // Use void return type after sending response
          res.status(500).json({ message: 'Internal server error: JWT secret missing.' });
          return;
      }

      const decoded = jwt.verify(token, jwtSecret) as { id: string };

      // Find user by ID from token payload
      const user = await User.findById(decoded.id);

      if (!user) {
          // Use void return type after sending response
          res.status(401).json({ message: 'User not found for provided token' });
          return;
      }

      // Attach user to request object (consider declaration merging for req.user type)
      // @ts-ignore // Temporary ignore if req.user type isn't extended
      req.user = user;
      next(); // Proceed to the next middleware/route handler

  } catch (error: any) {
      console.error('JWT Authentication error:', error.message);
      // Handle specific JWT errors (e.g., expired token)
      if (error.name === 'TokenExpiredError') {
           res.status(401).json({ message: 'Unauthorized - Token expired' });
           return;
      }
       if (error.name === 'JsonWebTokenError') {
           res.status(401).json({ message: 'Unauthorized - Invalid token signature' });
           return;
      }
      // Generic error for other cases
      res.status(401).json({ message: 'Unauthorized - Invalid token' });
      // No return needed here as response is sent
  }
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: '24h' // Token expires after 24 hours
  });
};
