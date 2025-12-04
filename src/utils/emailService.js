import nodemailer from 'nodemailer';

// Email configuration - SendGrid SMTP (Production-ready)
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@rajdhani.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Rajdhani Carpets';

// SendGrid SMTP configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

// Create Nodemailer transporter
let transporter = null;

// SendGrid SMTP configuration
if (SENDGRID_API_KEY) {
  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey', // SendGrid requires 'apikey' as username
      pass: SENDGRID_API_KEY // Your SendGrid API key
    }
  });
  
  console.log('📧 Email Service: Using SendGrid SMTP');
  console.log('   SMTP_HOST: smtp.sendgrid.net');
  console.log('   SMTP_PORT: 587');
  console.log('   EMAIL_FROM:', EMAIL_FROM);
  console.log('   ✅ Configured and ready to send emails');
} else {
  console.log('⚠️  Email Service: SendGrid API key not configured');
  console.log('   Set SENDGRID_API_KEY in .env file');
  console.log('   Get API key from: https://app.sendgrid.com/settings/api_keys');
  console.log('   For now, emails will be logged to console only');
}

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
export const sendOTPEmail = async (email, otp, userName = '') => {
  try {
    // If transporter not configured, return error
    if (!transporter) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email not sent (email service not configured). OTP for manual sharing:');
      console.log(`   User: ${userName || 'User'}`);
      console.log(`   Email: ${email}`);
      console.log(`   OTP: ${otp}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return { success: false, error: 'Email service not configured', skipped: true };
    }

    const mailOptions = {
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: email,
      subject: 'Login Verification Code - Rajdhani Carpets',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              border: 1px solid #ddd;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
            }
            .otp-box {
              background-color: #fff;
              border: 2px solid #2563eb;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
              letter-spacing: 8px;
              margin: 10px 0;
            }
            .info {
              background-color: #fff;
              padding: 15px;
              border-left: 4px solid #f59e0b;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏠 Rajdhani Carpets</h1>
              <p>ERP System - Login Verification</p>
            </div>

            <p>Hello ${userName || 'User'},</p>

            <p>You have requested to log in to the Rajdhani Carpets ERP System. Please use the verification code below to complete your login:</p>

            <div class="otp-box">
              <p style="margin: 0; color: #666;">Your Verification Code:</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; color: #666; font-size: 14px;">Valid for 10 minutes</p>
            </div>

            <div class="info">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0;">
                <li>This code will expire in 10 minutes</li>
                <li>Never share this code with anyone</li>
                <li>If you didn't request this code, please ignore this email</li>
              </ul>
            </div>

            <p>If you're having trouble logging in, please contact your system administrator.</p>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Rajdhani Carpets. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    // Log credentials if email fails
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  Email failed. OTP for manual sharing:');
    console.log(`   User: ${userName || 'User'}`);
    console.log(`   Email: ${email}`);
    console.log(`   OTP: ${otp}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return { success: false, error: error.message };
  }
};

// Send welcome email for new users
export const sendWelcomeEmail = async (email, userName, tempPassword) => {
  try {
    // If transporter not configured, return error - user should NOT be created
    if (!transporter) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ Email service not configured. User creation will fail.');
      console.log('   Set SENDGRID_API_KEY in .env file');
      console.log('   Get API key from: https://app.sendgrid.com/settings/api_keys');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return { 
        success: false, 
        error: 'Email service is not configured. Please set SENDGRID_API_KEY in .env file. Get API key from https://app.sendgrid.com/settings/api_keys',
        skipped: true 
      };
    }

    const mailOptions = {
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: email,
      subject: 'Welcome to Rajdhani Carpets ERP System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              border: 1px solid #ddd;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .credentials {
              background-color: #fff;
              border: 2px solid #10b981;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏠 Welcome to Rajdhani Carpets</h1>
            </div>

            <p>Hello ${userName},</p>

            <p>Your account has been created successfully in the Rajdhani Carpets ERP System.</p>

            <div class="credentials">
              <h3>Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 5px 10px; border-radius: 3px; font-size: 16px;">${tempPassword}</code></p>
            </div>

            <p><strong>⚠️ Important:</strong> Please change your password after your first login for security.</p>

            <p>You can now login to the system using your email and the temporary password above.</p>

            <div style="text-align: center; margin: 30px 0;">
              <p>If you have any questions, please contact your system administrator.</p>
            </div>

            <div class="footer" style="text-align: center; margin-top: 30px; color: #666;">
              <p>© ${new Date().getFullYear()} Rajdhani Carpets. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Log credentials if email fails
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  Email failed. User credentials for manual sharing:');
    console.log(`   User: ${userName}`);
    console.log(`   Email: ${email}`);
    console.log(`   Temporary Password: ${tempPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return { success: false, error: error.message };
  }
};
