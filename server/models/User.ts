import { Model, Schema, Document } from 'mongoose';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  githubId?: string;
  username: string;
  email: string;
  password: string;
  bio?: string;
  passwordReset: {
    token: string;
    expires: Date;
  },
  role: string;
  comparePassword(password: string): Promise<boolean>;
}

// Database User Schema
const UserSchema = new Schema<IUser>({
  githubId: {
    type: String,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: '',
  },
  passwordReset: {
    token: {
      type: String,
      default: '',
    },
    expires: {
      type: Date,
      default: null,
    },
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
});

//Securing password with salted hash before saving to database
UserSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) {
        return next(); 
    }
    try {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password!);
    };

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);