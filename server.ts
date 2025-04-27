import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import https from 'https';
import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

// Route Impoorts
import authenticateRoutes from './server/routes/authenticateRoutes';
import adminRoutes from './server/routes/adminRoutes';

const app = express();

dotenv.config();

//Load environment variables from .env file
const {
  PORT = 3000,
  JWT_SECRET,
  MONGO_URI,
  NODE_ENV,
  SSL_KEY_PATH,
  SSL_CERT_PATH,
  FRONTEND_URL,
} = process.env;

//Check if all required environment variables are set
if (!JWT_SECRET || !MONGO_URI || !NODE_ENV || !SSL_KEY_PATH || !SSL_CERT_PATH) {
  console.error('Error: Missing required environment variables. Check your .env file.');
  process.exit(1);
}

//HTTPS setup for production
//Before you run this project if there are no SSL certs in the certs folder, you can create them by running the following command in your terminal:
//openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
let sslOptions: https.ServerOptions | null = null;
if (NODE_ENV !== 'production') {
    // Check for SSL paths only if not in production
    if (!SSL_KEY_PATH || !SSL_CERT_PATH) {
        console.warn('Warning: SSL_KEY_PATH or SSL_CERT_PATH not set in .env. Running in HTTP mode for development.');
    } else {
        try {
            // Resolve paths relative to the project root
            const keyPath = path.resolve(SSL_KEY_PATH);
            const certPath = path.resolve(SSL_CERT_PATH);

            if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
                 throw new Error(`SSL key or cert file not found at specified paths: ${keyPath}, ${certPath}`);
            }

            sslOptions = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath),
            };
            console.log('SSL options loaded successfully for HTTPS.');
        } catch (err) {
            console.error('Error reading SSL certificate files:', err);
            console.warn('Falling back to HTTP mode due to SSL file error.');
            sslOptions = null;
        }
    }
} else {
    console.log('Production environment detected. Assuming HTTPS is handled by a reverse proxy or load balancer.');
}

//Middleware
import {
  authenticateJWT,
  checkRole,
} from './server/middleware/authMiddleware';
app.use(express.json());
app.use(cookieParser());

// Configure Helmet with HTTPS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://cdn.tailwindcss.com"],
    },
  },
  hsts: sslOptions ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
  } : false,
}));

const AllowedOrigins = FRONTEND_URL ? [FRONTEND_URL] : [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (AllowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
    },
    credentials: true,
}));

// This take our passport config and initializes it
import passport from './server/auth/passportConfig';
app.use(passport.initialize());

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after an hour.',
});

app.use((req, res, next) => {
  console.log(`Request reaching before /api/auth: ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRateLimiter, authenticateRoutes);
app.use('/api/admin', authenticateJWT, checkRole('admin'), adminRoutes);

//This is for connecting to Mongo DB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

//This middleware helps find errors
app.use(
  (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
  }
);

// This starts the server with the appropriate protocol (HTTP or HTTPS)
if (sslOptions) {
  // Create HTTPS server if SSL options are available
  https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(`HTTPS Server is running securely on port ${PORT}`);
  });
} else {
  // Fallback to HTTP server
  app.listen(PORT, () => {
      console.log(`HTTP Server is running on port ${PORT} (HTTPS not configured or SSL files missing/invalid)`);
  });
}