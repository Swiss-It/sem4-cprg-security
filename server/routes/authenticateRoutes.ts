import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { body, validationResult } from 'express-validator';
import { User } from 'server/models/User';
import { redirect } from 'react-router';
import { authenticateJWT, generateToken } from 'server/middleware/authMiddleware';

const router = express.Router();

// Register route
router.post(
    '/register',
    [
        body('username').isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
        body('email').isEmail().withMessage('Email is not valid'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const { username, email, password } = req.body;
            const user = new User({ username, email, password });

            await user.save();

            // Generate JWT token
            const token = generateToken(user._id.toString());
            
            const userData = user.toObject();
            delete userData.password;
            
            res.status(201).json({
              message: 'User registered successfully',
              token,
              user: userData
            });
        } catch (error: any) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Registration server', error: error });
        }
    }
);

// Login route
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());
    
    // Return user info and token
    const userData = user.toObject();
    delete userData.password;
    
    return res.status(200).json({ 
      message: 'Logged in successfully', 
      token,
      user: userData 
    });
  })(req, res, next);
});

// Github OAuth2 route

// Route to initiate GitHub login
// This redirects the user to GitHub's authorization page
router.get(
    '/github',
    passport.authenticate('github', { scope: ['user:email'] }) // Request email scope
);

// GitHub Callback Route
// GitHub redirects the user back to this URL after authorization
router.get(
    '/github/callback',
    passport.authenticate('github', {
        session: false,
        failureRedirect: '/login?error=github_failed'
    }),
    
    (req, res) => {
        const frontendDashboardUrl = `${process.env.FRONTEND_URL || 'https://localhost:5173'}/dashboard`;
        // Generate JWT token
        const token = generateToken(req.user._id.toString());
        
        // Redirect to frontend with token
        res.redirect(`${frontendDashboardUrl}?token=${token}`);
    }
);


// Logout route
router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
    console.log('JWT logout request received.');

    // Send a success response - client should handle token removal & redirection
    res.status(200).json({ message: 'Logout successful. Please discard your token.' });
});



// User route
// Protecte route to get user data based on JWT token provided in Authorization header
router.get('/session', authenticateJWT, (req: Request, res: Response) => {
    // If authenticateJWT calls next(), req.user should be populated.
    // Need to ensure req.user type is correctly inferred or asserted.
    // @ts-ignore // Temporary ignore if req.user type isn't extended
    const userObject = req.user?._doc || req.user;

    if (!userObject) {
        // This case should ideally be handled by authenticateJWT, but good safety check
        res.status(404).json({ message: 'User data not found on request after authentication.' });
        return; // Explicitily return void
    }

    // Exclude password before sending user data
    const { password, ...userData } = userObject;
    res.status(200).json({ user: userData });
});

export default router;