import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import type { IUser } from '../models/User';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => { // Return Promise<void>
  try {
      const token = req.cookies.access_token;

      console.log('Token from cookie:', token); // Debugging line

      if (!token) {
          // Use void return type after sending response
          res.status(401).json({ message: 'No authorization token provided in cookie' });
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

      // Ensure the payload structure matches how the token was signed (using 'id')
      const decoded = jwt.verify(token, jwtSecret) as { id: string };

      console.log('Decoded JWT payload ID:', decoded.id); // Debugging line: Log the ID being used

      // Find user by ID from token payload using 'decoded.id'
      const user = await User.findById(decoded.id);

      console.log('User found by findById:', user); // Debugging line: Log the result (null or user object)

      if (!user) {
          // Use void return type after sending response
          res.status(401).json({ message: 'User not found for provided token' });
          return;
      }

      req.user = user;
      next();

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
  }
};

// RBAC Middleware
export const checkRole = (allowedRoles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      //Technically should get caught by authenticateJWT middleware, but just being safe
      return res.status(401).json({ message: 'Authentication required' });
    }
    const roles = Array.isArray(allowedRoles)
    ?allowedRoles : [allowedRoles];
    const userRoles = req.user.role;

    if (roles.includes(userRoles)) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: Access denied.' });
    }
  };
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: '15m' // Token expires after 24 hours
  });
};
