// server/config/mailer.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure based on your email provider
// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST, // e.g., 'smtp.sendgrid.net' or 'smtp.gmail.com'
//   port: parseInt(process.env.EMAIL_PORT || '587', 10), // e.g., 587 or 465
//   secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
//   auth: {
//     user: process.env.EMAIL_USER, // Your email username (from .env)
//     pass: process.env.EMAIL_PASS, // Your email password or API key (from .env)
//   },
// });

export const sendPasswordResetEmail = async (
  to: string,
  token: string,
): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://localhost:5173';
  // IMPORTANT: Send the RAW token in the link
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
  
if ( process.env.NODE_ENV === 'development' ) {
  console.log('\n\n**************************************************');
  console.log('*          PASSWORD RESET TOKEN (DEV LOG)        *');
  console.log('**************************************************');
  console.log(`* Recipient (Would be): ${to}`);
  // Log the raw token directly - easy to copy/paste
  console.log(`* Raw Reset Token:      ${token}`);
  // Log the full URL - also easy to copy/paste into browser
  console.log(`* Full Reset URL:       ${resetUrl}`);
  console.log('**************************************************\n\n');
};

//   const mailOptions = {
//     from: `"Your App Name" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`, // Sender address
//     to: to, // List of receivers
//     subject: 'Password Reset Request', // Subject line
//     text: `You requested a password reset. Click this link to reset your password: ${resetUrl}\n\nIf you did not request this, please ignore this email. This link will expire in 15 minutes.`, // Plain text body
//     html: `<p>You requested a password reset. Click the link below to reset your password:</p>
//            <p><a href="${resetUrl}">Reset Password</a></p>
//            <p>If you did not request this, please ignore this email. This link will expire in 15 minutes.</p>`, // HTML body
//   };

//   try {
//     console.log(`Sending password reset email to ${to}...`);
//     const info = await transporter.sendMail(mailOptions);
//     console.log('Password reset email sent: %s', info.messageId);
//   } catch (error) {
//     console.error('Error sending password reset email:', error);
//     // Depending on your app's needs, you might want to throw this error
//     // or handle it silently so as not to reveal email existence issues.
//     // Throwing might be better for debugging initially.
//     throw new Error('Failed to send password reset email.');
//   }
return Promise.resolve();
};
