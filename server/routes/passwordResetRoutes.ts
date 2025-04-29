// // server/routes/authenticateRoutes.ts
// import express from 'express';
// import type { Request, Response, NextFunction } from 'express';
// import passport from 'passport';
// import { body, validationResult } from 'express-validator';
// import crypto from 'crypto'; // Import crypto for token generation
// import bcrypt from 'bcrypt'; // Import bcrypt for hashing token
// import { User } from 'server/models/User';
// import csurf from 'csurf';
// // Assuming mailer is correctly set up
// import { sendPasswordResetEmail } from 'server/config/mailer';
// import {
//   authenticateJWT,
//   generateToken,
// } from 'server/middleware/authMiddleware';
// import rateLimit from 'express-rate-limit'; // Import rate-limiter

// const router = express.Router();

// // --- Rate Limiter for Password Reset ---
// const passwordResetLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // Limit each IP to 5 requests per windowMs
//   message:
//     'Too many password reset requests from this IP, please try again after 15 minutes',
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// });

// // Helper function to set JWT cookie (already exists)
// const setJwtCookie = (res: Response, token: string) => {
//   res.cookie('access_token', token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'strict',
//     maxAge: 60 * 60 * 24 * 30, // 30 days
//   });
// };

// // Helper function to clear JWT cookie (already exists)
// const clearJWTCookie = (res: Response) => {
//   res.cookie('access_token', '', {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'strict',
//     expires: new Date(0),
//   });
// };

// // Csurf Protection Setup (already exists)
// const csrfProtection = csurf({
//   cookie: {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'strict',
//   },
// });

// // --- Validation Middleware (already exists) ---
// const validateRegistration = [
//   // ... (keep existing)
// ];
// const validateLogin = [
//   // ... (keep existing)
// ];

// // --- Existing Routes (Register, Login, GitHub, Logout, Session, Profile Update) ---
// // ... (keep existing routes: /register, /login, /github, /github/callback, /logout, /session)

// // --- MODIFIED: Profile Update Route ---
// router.put(
//   '/profile',
//   csrfProtection, // Keep CSRF for profile updates
//   authenticateJWT,
//   async (req: Request, res: Response) => {
//     try {
//       const userId = req.user?._id;
//       if (!userId) {
//         return res.status(401).json({ message: 'Authentication error' });
//       }

//       // Get data from request body - REMOVE password from here
//       const { username, email, bio } = req.body;

//       const user = await User.findById(userId);
//       if (!user) {
//         return res.status(404).json({ message: 'User not found' });
//       }

//       // Update fields provided in the request
//       if (username) user.username = username;
//       if (email) user.email = email;
//       if (bio !== undefined) user.bio = bio;
//       // DO NOT update password here anymore

//       await user.save();

//       const userData = user.toObject();
//       delete userData.password;
//       delete userData.passwordReset; // Ensure reset token isn't sent

//       res.status(200).json({
//         message: 'Profile updated successfully',
//         user: userData,
//       });
//     } catch (error: any) {
//       console.error('Profile update error:', error);
//       if (error.code === 11000) {
//         return res.status(400).json({ message: 'Email already in use.' });
//       }
//       res.status(500).json({ message: 'Server error updating profile' });
//     }
//   },
// );

// // --- NEW: Request Password Reset Route ---
// router.post(
//   '/request-password-reset',
//   passwordResetLimiter, // Apply rate limiting
//   // No CSRF needed here - user might not have a session/token
//   body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
//   async (req: Request, res: Response) => {
//     const errors = validationResult(req);
//     // Even if validation fails, return generic message to prevent enumeration
//     if (!errors.isEmpty()) {
//       console.warn('Password reset request validation failed:', errors.array());
//       return res.status(200).json({
//         message:
//           'If an account with that email exists, a password reset link has been sent.',
//       });
//     }

//     const { email } = req.body;

//     try {
//       const user = await User.findOne({ email });

//       if (user) {
//         // 1. Generate Secure Random Token (RAW)
//         const rawToken = crypto.randomBytes(32).toString('hex');

//         // 2. Hash the token before storing
//         const hashedToken = await bcrypt.hash(rawToken, 10); // Salt rounds = 10

//         // 3. Set Expiration (e.g., 15 minutes from now)
//         const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

//         // 4. Store HASHED token and expiration in DB
//         user.passwordReset = {
//           token: hashedToken,
//           expires: expires,
//         };
//         await user.save();

//         // 5. Send email with the RAW token
//         await sendPasswordResetEmail(user.email, rawToken);
//         console.log(`Password reset email initiated for ${email}`);
//       } else {
//         // User not found - DO NOTHING to the database or email
//         console.log(
//           `Password reset requested for non-existent email: ${email}`,
//         );
//       }

//       // ALWAYS return a generic success message
//       res.status(200).json({
//         message:
//           'If an account with that email exists, a password reset link has been sent.',
//       });
//     } catch (error) {
//       console.error('Error during password reset request:', error);
//       // Still return generic message on internal errors
//       res.status(200).json({
//         message:
//           'If an account with that email exists, a password reset link has been sent.',
//       });
//     }
//   },
// );

// // --- NEW: Reset Password with Token Route ---
// router.post(
//   '/reset-password',
//   passwordResetLimiter, // Apply rate limiting
//   // No CSRF needed - relies on the unique token from email
//   [
//     body('token').notEmpty().withMessage('Token is required'),
//     body('password')
//       .isLength({ min: 6 })
//       .withMessage('Password must be at least 6 characters long'),
//     // Add password confirmation validation if desired (handled on frontend first)
//   ],
//   async (req: Request, res: Response) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { token: rawToken, password: newPassword } = req.body;

//     try {
//       // Find users whose token *might* be valid (not expired, token field exists)
//       // This is less efficient than indexing the raw token, but necessary because we hash it.
//       const potentialUsers = await User.find({
//         'passwordReset.expires': { $gt: Date.now() }, // Token not expired
//         'passwordReset.token': { $ne: null, $ne: '' }, // Token field is set
//       });

//       let userFound = null;
//       for (const user of potentialUsers) {
//         if (user.passwordReset?.token) {
//           // Compare the RAW token from the request with the HASHED token in the DB
//           const isMatch = await bcrypt.compare(
//             rawToken,
//             user.passwordReset.token,
//           );
//           if (isMatch) {
//             userFound = user;
//             break; // Found the matching user
//           }
//         }
//       }

//       // Check if user was found and token is valid/not expired
//       if (!userFound) {
//         console.warn('Invalid or expired password reset token attempt.');
//         return res
//           .status(400)
//           .json({ message: 'Password reset token is invalid or has expired.' });
//       }

//       // Update password (pre-save hook will hash it)
//       userFound.password = newPassword;

//       // Clear reset token fields to invalidate it after use
//       userFound.passwordReset = { token: undefined, expires: null }; // Use undefined or null

//       // Save the user
//       await userFound.save();

//       // Optional: Send confirmation email that password was changed

//       res.status(200).json({ message: 'Password has been reset successfully.' });
//     } catch (error) {
//       console.error('Error during password reset:', error);
//       res.status(500).json({ message: 'Internal server error' });
//     }
//   },
// );

// export default router;
