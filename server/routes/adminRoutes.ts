import express from 'express';
import { User } from '../models/User';
import type { Request, Response } from 'express';

const router = express.Router();


// This endpoint is a list of all users, accessible only by admins
router.get('/users', async (req: Request, res: Response) => {
  try {
    // Find all users, excluding password and reset token fields
    const users = await User.find({}, '-password -passwordReset');
    res.status(200).json({ users });
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// I would add more routes here later that only admins should access
// e.g., router.delete('/users/:id', ...)
// e.g., router.put('/users/:id/role', ...)

export default router;