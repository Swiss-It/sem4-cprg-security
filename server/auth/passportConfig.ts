import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GithubStrategy } from 'passport-github2';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from 'server/models/User';

dotenv.config();

// Local Strategy Config
passport.use(new LocalStrategy(
    {
        usernameField: 'email'
    },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                return done(null, false, { message: 'Incorrect email or password.' });
            }
            // Ensure comparePassword method exists and works
            if (!user.comparePassword) {
                 console.error(`User ${user.email} is missing comparePassword method!`);
                 return done(new Error('Authentication setup error.'));
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect email or password.' });
            }
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

// Github Stragey Config
passport.use(
    new GithubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID || '',
            clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
            callbackURL: 'https://localhost:3000/api/auth/github/callback',
            scope: ['user:email'],
        },
        async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any, info?: any) => void) => {
            try {
                let user = await User.findOne({ githubId: profile.id });
                if (!user) {
                    const email = profile.emails?.[0]?.value;
                    if (email) {
                        user = await User.findOne({ email: email });
                        if (user) {
                            user.githubId = profile.id;
                            await user.save();
                        }
                    }
                    if (!user) {
                        user = new User({
                            githubId: profile.id,
                            username: profile.username || profile.displayName,
                            email: email,
                            // Generate a random password for OAuth users
                            password: Math.random().toString(36).slice(-10),
                        });
                        await user.save();
                    }
                }
                return done(null, user);
            } catch (error) {
                console.error('Error during GitHub authentication:', error);
                return done(error);
            }
        }
    )
);

export default passport;