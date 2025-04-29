import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto'; // Import crypto for token generation
import bcrypt from 'bcrypt'; // Import bcrypt for hashing token
import { User } from 'server/models/User';
import csurf from 'csurf';
// Assuming mailer is correctly set up
import { sendPasswordResetEmail } from 'server/config/mailer';
import { authenticateJWT, generateToken } from 'server/middleware/authMiddleware';
import rateLimit from 'express-rate-limit'; // Import rate-limiter

const router = express.Router();

// Password Reset Rate Limiter
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message:
    'Too many password reset requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false, 
});

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

const sanitizeProfile = [
    body('username').trim().escape().notEmpty().withMessage('Username is required'),
    body('email').trim().escape().isEmail().withMessage('Valid email is required'),
    body('bio').trim().escape(),
];

// Register route
router.post(
    '/register',
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
  '/profile',
  csrfProtection,
  authenticateJWT,
  sanitizeProfile,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId || !req.user) { // Check req.user exists
        return res.status(401).json({ message: 'Authentication error' });
      }

      // Get data from request body - bio is plaintext here
      const { username, email, bio } = req.body;

      // Find the user document
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update fields provided in the request
      // The pre('save') hook will handle encrypting the bio if it changes
      if (username !== undefined) user.username = username;
      if (email !== undefined) user.email = email;
      // Update bio - allow setting it to null/empty
      if (bio !== undefined) user.bio = bio;

      await user.save(); // Triggers pre('save') hook for encryption

      // user.toJSON() applies the transform (decrypts bio) for the response
      res.status(200).json({
        message: 'Profile updated successfully',
        user: user.toJSON(), // Use toJSON()
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Email already in use.' });
      }
      res.status(500).json({ message: 'Server error updating profile' });
    }
  },
);

// --- NEW: Request Password Reset Route ---
router.post(
  '/request-password-reset',
  passwordResetLimiter, // Apply rate limiting
  // No CSRF needed here - user might not have a session/token
  body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    // Even if validation fails, return generic message to prevent enumeration
    if (!errors.isEmpty()) {
      console.warn('Password reset request validation failed:', errors.array());
      return res.status(200).json({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const { email } = req.body;

    try {
      const user = await User.findOne({ email });

      if (user) {
        // 1. Generate Secure Random Token (RAW)
        const rawToken = crypto.randomBytes(32).toString('hex');

        // 2. Hash the token before storing
        const hashedToken = await bcrypt.hash(rawToken, 10); // Salt rounds = 10

        // 3. Set Expiration (e.g., 15 minutes from now)
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // 4. Store HASHED token and expiration in DB
        user.passwordReset = {
          token: hashedToken,
          expires: expires,
        };
        await user.save();

        // 5. Send email with the RAW token
        await sendPasswordResetEmail(user.email, rawToken);
        console.log(`Password reset email initiated for ${email}`);
      } else {
        // User not found - DO NOTHING to the database or email
        console.log(
          `Password reset requested for non-existent email: ${email}`,
        );
      }

      // ALWAYS return a generic success message
      res.status(200).json({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Error during password reset request:', error);
      // Still return generic message on internal errors
      res.status(200).json({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
    }
  },
);

// Reset Password with Token
router.post(
  '/reset-password',
  passwordResetLimiter, // Apply rate limiting
  // No CSRF needed - relies on the unique token from email
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    // Add password confirmation validation if desired (handled on frontend first)
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token: rawToken, password: newPassword } = req.body;

    try {
      // Find users whose token *might* be valid (not expired, token field exists)
      // This is less efficient than indexing the raw token, but necessary because we hash it.
      const potentialUsers = await User.find({
        'passwordReset.expires': { $gt: Date.now() }, // Token not expired
        'passwordReset.token': { $ne: null, $ne: '' }, // Token field is set
      });

      let userFound = null;
      for (const user of potentialUsers) {
        if (user.passwordReset?.token) {
          // Compare the RAW token from the request with the HASHED token in the DB
          const isMatch = await bcrypt.compare(
            rawToken,
            user.passwordReset.token,
          );
          if (isMatch) {
            userFound = user;
            break; // Found the matching user
          }
        }
      }

      // Check if user was found and token is valid/not expired
      if (!userFound) {
        console.warn('Invalid or expired password reset token attempt.');
        return res
          .status(400)
          .json({ message: 'Password reset token is invalid or has expired.' });
      }

      // Update password (pre-save hook will hash it)
      userFound.password = newPassword;

      // Clear reset token fields to invalidate it after use
      userFound.passwordReset = { token: undefined, expires: null }; // Use undefined or null

      // Save the user
      await userFound.save();

      // Optional: Send confirmation email that password was changed

      res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error) {
      console.error('Error during password reset:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

export default router;