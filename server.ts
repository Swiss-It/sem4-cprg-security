import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';

const app = express();
const { auth } = require('express-oauth2-jwt-bearer');

// Load environment variables from .env file
const {
  PORT = 3001,
  SESSION_SECRET,
  MONGO_URI,

  NODE_ENV,
} = process.env;

if (!SESSION_SECRET || !MONGO_URI || ) {
  console.error('Error: Missing required environment variables. Check your .env file.');
  process.exit(1);
}


app.get('/', (request: express.Request, response: express.Response) => {
  response.send('Hello World!');
});

// --- Mongoose Setup ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });



app.listen(5000, () => {
  console.log('Server is running on port 5000');
});