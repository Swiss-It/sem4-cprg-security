import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from 'fs'; // Import file system module
import path from 'path'; // Import path module

// Load paths from environment variables (optional but good practice)
// Ensure dotenv is configured if you load these from .env here
// Or hardcode paths carefully for local dev
const keyPath = process.env.SSL_KEY_PATH || './certs/key.pem';
const certPath = process.env.SSL_CERT_PATH || './certs/cert.pem';

// Function to load SSL options safely
const loadHttpsOptions = () => {
  try {
    const resolvedKeyPath = path.resolve(keyPath);
    const resolvedCertPath = path.resolve(certPath);

    if (fs.existsSync(resolvedKeyPath) && fs.existsSync(resolvedCertPath)) {
      console.log('Loading HTTPS certs for Vite dev server...');
      return {
        key: fs.readFileSync(resolvedKeyPath),
        cert: fs.readFileSync(resolvedCertPath),
      };
    } else {
      console.warn('SSL key or cert file not found for Vite. Running Vite dev server in HTTP mode.');
      return false; // Indicate HTTPS should not be enabled
    }
  } catch (error) {
    console.error('Error reading SSL files for Vite:', error);
    console.warn('Running Vite dev server in HTTP mode due to SSL error.');
    return false; // Indicate HTTPS should not be enabled
  }
};

const httpsOptions = loadHttpsOptions();

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(), // Make sure you have the React plugin
    tsconfigPaths()
    // Remove reactRouter() plugin if you are not using its specific features like SSR helpers
  ],
  server: {
    // Enable HTTPS if options were loaded successfully
    ...(httpsOptions ? { https: httpsOptions } : {}),
    // Configure proxy for API requests (important!)
    proxy: {
      '/api': {
        // Target your BACKEND server (which might now be HTTPS)
        target: `https://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`, // Use HTTPS for backend target
        changeOrigin: true,
        // If backend uses self-signed cert, you might need to bypass rejection
        secure: false, // Set to false to allow self-signed certs on backend
      }
    },
    // Optional: Specify port for Vite dev server if needed
    // port: 5173,
  }
});