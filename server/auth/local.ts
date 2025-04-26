import passport from 'passport';
import bcrypt from 'bcrypt';
import { Strategy as LocalStrategy } from 'passport-local';
import { User } from '../models/User';
import type { IUser } from '../models/User';

passport.use(
    new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password',
        },
        async (email, password, done) => {
            try {
                const user: IUser | null = await User.findOne({ email: email });
                if (!user) {
                    return done(null, false, { message: 'Incorrect email or password.' });
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
    )
);

// Serialize user to store in session
    passport.serializeUser((user: any, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: string, done) => {
        try {
            const user: IUser | null = await User.findById(id);
            if (user) {
                done(null, user);
            } else {
                done(new Error('User not found')); // Or handle the error appropriately
            }
        } catch (error) {
            done(error);
        }
    });

    export default passport;
