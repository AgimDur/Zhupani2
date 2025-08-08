import nodemailer from 'nodemailer';
import { EmailData } from '../types';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email function
export const sendEmail = async (emailData: EmailData): Promise<void> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Zhupani Family Tree <noreply@zhupani.com>',
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  firstName: string
): Promise<void> => {
  const resetUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset - Zhupani Family Tree</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌳 Zhupani Family Tree</h1>
        <p>Password Reset Request</p>
      </div>
      
      <div class="content">
        <h2>Hello ${firstName},</h2>
        
        <p>We received a request to reset your password for your Zhupani Family Tree account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
        
        <div class="warning">
          <strong>⚠️ Important:</strong>
          <ul>
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request this password reset, please ignore this email</li>
            <li>For security reasons, this link can only be used once</li>
          </ul>
        </div>
        
        <p>If you have any questions, please contact our support team.</p>
        
        <p>Best regards,<br>The Zhupani Family Tree Team</p>
      </div>
      
      <div class="footer">
        <p>This email was sent to ${email}</p>
        <p>© 2024 Zhupani Family Tree. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `Password Reset - Zhupani Family Tree\n\nHello ${firstName},\n\nWe received a request to reset your password for your Zhupani Family Tree account.\n\nOpen this link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour. If you didn't request this, ignore this email.`;

  await sendEmail({ to: email, subject: 'Password Reset - Zhupani Family Tree', html, text });
};

// Send welcome email
export const sendWelcomeEmail = async (
  email: string,
  firstName: string
): Promise<void> => {
  const loginUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/login`;
  const html = `<html><body><h1>Welcome, ${firstName}</h1><p>Login: <a href=\"${loginUrl}\">${loginUrl}</a></p></body></html>`;
  const text = `Welcome ${firstName}. Login: ${loginUrl}`;
  await sendEmail({ to: email, subject: 'Welcome to Zhupani Family Tree!', html, text });
};
