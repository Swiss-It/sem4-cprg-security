import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { body, cookie, validationResult } from 'express-validator';
import { User } from 'server/models/User';
import csurf from 'csurf';
import { redirect } from 'react-router';
import { authenticateJWT, generateToken } from 'server/middleware/authMiddleware';

const router = express.Router();

// Helper function to set JWT cookie
const setJwtCookie = (res: Response, token: string) => {
    res.cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });
};

// Helper function to clear JWT cookie
const clearJWTCookie = (res: Response) => {
    res.cookie('access_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0), //
    });
};

// Csurf Protection
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

//Moving the Validation middleware to make it global for registration and login
const validateRegistration = [
        body('username').trim().escape().isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
    body('email').trim().normalizeEmail().isEmail().withMessage('Email is not valid'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    ];

const validateLogin = [ // Message is vague to prevent account enumeration
    body('email').trim().normalizeEmail().isEmail().withMessage('Invalid email or password'),
    body('password').isLength({ min: 6 }).withMessage('Invalid email or password'),
];

// Register route
router.post(
    '/register',
    csrfProtection, // <-- Apply CSRF protection middleware HERE
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Send validation error, don't proceed to passport
        return res.status(401).json({ message: 'Invalid email or password' });
        // Or return res.status(400).json({ errors: errors.array() });
    },
    validateRegistration,
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

            // Configure JWT Storage to httpOnly cookie
            setJwtCookie (res, token);
            
            const userData = user.toObject();
            delete userData.password;

            console.log('User data after registration:', userData);
            
            res.status(201).json({
              message: 'User registered successfully',
              // Removed token from response
              user: userData
            });
        } catch (error: any) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Registration server', error: error });
        }
    }
);

// Login route
router.post('/login', csrfProtection, validateLogin, (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
  }
  
    passport.authenticate('local', { session: false }, (error: any, user: any, info: any) => {
    if (error) {
      return next(error);
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());

    // Set JWT in an httpOnly cookie
    setJwtCookie(res, token);
    
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
    (req: Request, res:Response) => {
    if (req.user) {
        const frontendDashboardUrl = `${process.env.FRONTEND_URL || 'https://localhost:5173'}/dashboard`;

        // Generate JWT token
        const token = generateToken(req.user._id.toString());

        setJwtCookie(res, token);
        console.log('Is this cookie being set?', res.getHeaders());
        
        // Redirect to frontend with token
        res.redirect(`${frontendDashboardUrl}`);
        } else {
            // Redirect to fronted if user is not authenticated(most likely won't reach this point)
            res.redirect(`${process.env.FRONTEND_URL || 'https://localhost:5173'}/login?error=auth_failed`);
        }
    }
);


// Logout route
router.post('/logout', csrfProtection, (req: Request, res: Response, next: NextFunction) => {
    console.log('JWT logout request received.');

    //Clear the httponly cookie
    clearJWTCookie(res)

    // Send a success response - client should handle token removal & redirection
    res.status(200).json({ message: 'Logout successful. Please discard your token.' });
});



// User route
// Protecte route to get user data based on JWT token provided in Authorization header
router.get('/session', csrfProtection, authenticateJWT, (req: Request, res: Response) => {
    
    const userObject = req.user?._doc || req.user;

    if (!userObject) {

        res.status(404).json({ message: 'User data not found on request after authentication.' });
        return; 
    }

    // Exclude password before sending user data
    const { password, ...userData } = userObject;
    res.status(200).json({ user: userData });
});


// Profile update route
router.put(
  '/profile',csrfProtection, authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        // Should not happen if authenticateJWT works, but good check
        return res.status(401).json({ message: 'Authentication error' });
      }

      // Get data from request body
      const { username, email, bio, password } = req.body;

      // Find the user in the database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update fields provided in the request
      if (username) user.username = username;
      if (email) user.email = email;
      if (bio !== undefined) user.bio = bio;
      // Only hash and save password if a new one is provided
      if (password) {
        user.password = password;
      }

      // Save the updated user document
      await user.save();

      // Return the updated user data (excluding sensitive fields)
      const userData = user.toObject();
      delete userData.password;
      delete userData.passwordReset;

      res.status(200).json({
        message: 'Profile updated successfully',
        user: userData,
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      // Handle potential errors like duplicate email
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Email already in use.' });
      }
      res.status(500).json({ message: 'Server error updating profile' });
    }
  },
);

export default router;