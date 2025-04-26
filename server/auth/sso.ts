import passport from 'passport';
import { Strategy as GithubStrategy } from 'passport-github2';
import { User } from '../models/User'; // Assuming IUser is exported from User model
import type { Request, Response, NextFunction } from 'express'; // Import Request and Response

passport.use(
    new GithubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID || '',
            clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
            callbackURL: '/api/auth/github/callback', // Ensure this matches GitHub app settings
            scope: ['user:email'], // Request email scope
        },
        async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any, info?: any) => void) => {
            try {
                // Try to find user by GitHub ID
                let user = await User.findOne({ githubId: profile.id });

                if (!user) {
                    // If user not found by GitHub ID, try finding by email (if available)
                    const email = profile.emails?.[0]?.value;
                    if (email) {
                        user = await User.findOne({ email: email });
                        if (user) {
                            // Link GitHub ID to existing user found by email
                            user.githubId = profile.id;
                            await user.save();
                        }
                    }

                    // If still no user, create a new one
                    if (!user) {
                        user = new User({
                            githubId: profile.id,
                            username: profile.username || profile.displayName, // Use username or displayName
                            email: email, // Use email from profile if available
                            // Note: No password needed for OAuth users unless you implement a flow for it
                        });
                        await user.save();
                    }
                }
                // User found or created, proceed with login
                return done(null, user);

            } catch (error) {
                console.error('Error during GitHub authentication:', error);
                return done(error);
            }
        }
    )
);

// Serialize user ID to the session
passport.serializeUser((user: any, done) => { // Use 'any' or your specific User type
    done(null, user.id); // Use user.id (added by Mongoose) or user._id
});

// Deserialize user from the session ID
passport.deserializeUser(async (id: string, done) => { // id should be string
    try {
        const user = await User.findById(id);
        // Pass error if user not found, null for user
        done(null, user || null);
    } catch (error) {
        console.error('Error during deserialization:', error);
        done(error, null);
    }
});

// Route handler to initiate GitHub authentication
export const githubAuth = passport.authenticate('github', { scope: ['user:email'] });

// Route handler for GitHub callback
export const githubCallback = passport.authenticate('github', {
    // Redirect based on success/failure
    // failureRedirect: '/login?error=github_failed', // Redirect to login page with an error query param
    // successRedirect: '/dashboard', // Redirect directly to dashboard after successful login & session setup
    session: true // Ensure session is established
});

// Optional: Separate success handler if you don't use successRedirect
// This might be useful if you want to send JSON instead of redirecting immediately
export const githubSuccess = (req: Request, res: Response) => {
    if (req.user) {
        // Instead of sending JSON, usually you redirect here after callback success
        res.redirect('/dashboard'); // Or wherever your app should go
        // Example JSON response if needed:
        // const { password, ...userData } = (req.user as any)._doc;
        // res.status(200).json({ message: 'Authentication successful', user: userData });
    } else {
        // This case shouldn't typically be reached if passport.authenticate succeeds
        res.redirect('/login?error=auth_failed');
    }
};

// Optional: Separate failure handler if you don't use failureRedirect
export const githubFailure = (req: Request, res: Response) => {
    res.status(401).json({ message: 'GitHub Authentication failed' });
    // Or redirect:
    // res.redirect('/login?error=github_failed');
};

// Logout handler
export const githubLogout = (req: Request, res: Response, next: NextFunction) => { // Added next for error handling
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return next(err); // Pass error to error handling middleware
        }
        // Successful logout - often redirect to login or home page
        res.redirect('/login');
        // Example JSON response if needed:
        // res.status(200).json({ message: 'Logout successful' });
    });
};