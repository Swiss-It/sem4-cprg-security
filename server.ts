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
import csurf from 'csurf'

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

//Middleware for managing roles
import {
  authenticateJWT,
  checkRole,
} from './server/middleware/authMiddleware';

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
app.use(express.json());

const frontendUrl = FRONTEND_URL; // e.g., https://localhost:5173
if (!frontendUrl) {
  console.warn('Warning: FRONTEND_URL not set in .env. CORS might block frontend.');
}
const allowedOrigins = frontendUrl ? [frontendUrl] : [];
console.log('Allowed CORS Origins:', allowedOrigins);


//custom cors config for SSO issues
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like same-origin requests or server-to-server) OR from allowed origins
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      // console.log(`CORS check: Allowing origin: ${origin || 'N/A'}`); // Optional: reduce noise
      callback(null, true);
    } else {
      console.error(`CORS check: Blocking origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true, // IMPORTANT: Allow cookies/credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Explicitly allow headers needed
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// This take our passport config and initializes it
import passport from './server/auth/passportConfig';
app.use(passport.initialize());

// Csurf Protection
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    // Consider adding 'maxAge' if desired
  },
});

app.get('/api/csrf-token', csrfProtection, (req, res) => {
  // Send the generated token to the client
  res.json({ csrfToken: req.csrfToken() });
});

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
app.use('/api/admin', authenticateJWT, checkRole('admin'), csrfProtection, adminRoutes);

//This is for connecting to Mongo DB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

  // Custom error handling for CSRF tokens
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('CSRF Token Error:', err.message);
    // Handle CSRF token errors here - typically send a 403 Forbidden
    res.status(403).json({ message: 'Invalid CSRF token' });
  } else {
    // Pass other errors along
    next(err);
  }
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