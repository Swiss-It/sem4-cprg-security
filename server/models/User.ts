import { Model, Schema, Document } from 'mongoose';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { encrypt, decrypt } from 'server/utils/encryption';

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
    default: null,
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
    default: null,
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
},
  
  {
    timestamps: true, // Optional: adds createdAt and updatedAt
    toJSON: {
      transform: function (doc, ret) {
        // Remove sensitive fields from JSON output
        delete ret.password;
        delete ret.passwordReset;
        delete ret.__v; // Remove version key

        // --- DECRYPT BIO ---
        if (ret.bio) {
          const decryptedBio = decrypt(ret.bio);
          // If decryption fails, decide what to return.
          // Returning null might be safer than returning corrupted/encrypted data.
          ret.bio = decryptedBio; // Replace encrypted bio with decrypted version
          if (decryptedBio === null) {
             console.warn(`Failed to decrypt bio for user ${ret._id}. Returning null.`);
          }
        }
        // -------------------

        return ret;
      },
    },
    // Also apply transform to toObject if you use it elsewhere
    toObject: {
        transform: function (doc, ret) {
            delete ret.password;
            delete ret.passwordReset;
            delete ret.__v;
            if (ret.bio) {
                ret.bio = decrypt(ret.bio); // Also decrypt for toObject
            }
            
            return ret;
        }
      }
  },
  // --------------------------
);

//githubId index for first time registration
UserSchema.index(
  { githubId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      githubId: { $exists: true, $ne: null }
    }
  }
);

//Securing password with salted hash before saving to database
UserSchema.pre<IUser>('save', async function (next) {
  console.log(`[pre('save')] Hook triggered for user: ${this.email || this._id}`);
  console.log(`[pre('save')] Is 'password' modified?`, this.isModified('password'));
  console.log(`[pre('save')] Is 'bio' modified?`, this.isModified('bio'));
  console.log(`[pre('save')] Current bio value before potential encryption:`, this.bio);

  let errorOccurred: Error | null = null;

  // --- Hash Password if Modified ---
  if (this.isModified('password') && this.password) {
    console.log(`[pre('save')] Hashing password...`);
    try {
      this.password = await bcrypt.hash(this.password, 10);
      console.log(`[pre('save')] Password hashing successful.`);
    } catch (error: any) {
      console.error('[pre(\'save\')] Password hashing failed:', error);
      errorOccurred = error; // Store error to pass later
    }
  }

  // --- Encrypt Bio if Modified (Run even if password wasn't modified) ---
  // Check for previous error before attempting bio encryption
  if (!errorOccurred && this.isModified('bio')) {
    console.log(`[pre('save')] Attempting to encrypt bio...`);
    const originalBioForLog = this.bio; // Store for logging

    if (this.bio) { // Only encrypt if bio is truthy
      try {
        const encryptedBio = encrypt(this.bio); // Call encrypt util
        console.log(`[pre('save')] encrypt() returned:`, encryptedBio ? `${encryptedBio.substring(0, 30)}...` : encryptedBio); // Log result

        if (encryptedBio === null && originalBioForLog !== null) {
          console.error(`[pre('save')] Bio encryption returned null! Original was not null.`);
          this.bio = null; // Store null if encryption failed
          // Optionally create an error: errorOccurred = new Error('Bio encryption failed');
        } else {
          this.bio = encryptedBio; // Assign the encrypted value back
          console.log(`[pre('save')] Successfully assigned encrypted bio.`);
        }
      } catch (error: any) {
         console.error('[pre(\'save\')] Bio encryption threw an error:', error);
         errorOccurred = error; // Store error
         this.bio = null; // Don't save potentially bad data
      }
    } else {
      console.log(`[pre('save')] Bio is null or empty, ensuring it's stored as null.`);
      this.bio = null; // Ensure null/empty string becomes null in DB
    }
  } else if (!errorOccurred) {
      // Log only if no error occurred previously
      console.log(`[pre('save')] Bio was not modified, skipping encryption.`);
  }

  // --- Call next() ONCE at the end ---
  if (errorOccurred) {
    console.log(`[pre('save')] Calling next() with error.`);
    next(errorOccurred); // Pass the first error encountered
  } else {
    console.log(`[pre('save')] Calling next() without error.`);
    next(); // Continue the save operation if no errors
  }
});

// Compare password
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password!);
    };

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);