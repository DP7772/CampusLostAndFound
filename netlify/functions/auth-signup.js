import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

const sql = neon(process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { action, email, otp, password } = JSON.parse(event.body);

    // --- 1. SEND OTP WITH PROFESSIONAL HTML TEMPLATE ---
    if (action === 'send-otp') {
      const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existingUser.length > 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Email already registered. Please login.' }) };
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await sql`
        INSERT INTO otps (email, otp_code, expires_at) 
        VALUES (${email}, ${generatedOtp}, ${expiresAt})
        ON CONFLICT (email) 
        DO UPDATE SET otp_code = ${generatedOtp}, expires_at = ${expiresAt}
      `;

      // Professional Branded Email Template
      const mailOptions = {
        from: `"Campus Lost & Found Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔒 Your Secure Verification Code - Campus L&F Portal',
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #050505; color: #ffffff; padding: 30px; border-radius: 12px;">
            <div style="max-width: 500px; margin: auto; background: #111116; padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
              <h2 style="color: #3b82f6; margin-top: 0; text-align: center;">Campus Lost & Found</h2>
              <p style="color: #94a3b8; font-size: 14px; text-align: center;">Smart Campus Recovery Ecosystem</p>
              <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
              <p style="font-size: 15px; color: #e2e8f0;">Hello,</p>
              <p style="font-size: 15px; color: #e2e8f0;">You requested verification for your campus account. Use the secure one-time passcode below:</p>
              
              <div style="background: #000000; padding: 20px; text-align: center; border-radius: 12px; margin: 25px 0; border: 1px solid rgba(59, 130, 246, 0.3);">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3b82f6;">${generatedOtp}</span>
              </div>
              
              <p style="font-size: 13px; color: #f87171; text-align: center;">⏱️ This code is valid for exactly 5 minutes.</p>
              <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px;">If you didn't request this, please ignore this email.<br/>Sent securely via Campus L&F Authority Desk.</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'OTP sent successfully' }) };
    }

    // --- 2. VERIFY OTP ---
    if (action === 'verify-otp') {
      const records = await sql`SELECT * FROM otps WHERE email = ${email}`;
      
      if (records.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'OTP expired or not requested.' }) };
      }

      const record = records[0];
      if (new Date() > new Date(record.expires_at)) {
        await sql`DELETE FROM otps WHERE email = ${email}`;
        return { statusCode: 400, body: JSON.stringify({ error: 'OTP has expired. Please request a new one.' }) };
      }

      if (record.otp_code !== otp) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid OTP code.' }) };
      }

      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Verified' }) };
    }

    // --- 3. COMPLETE SIGNUP & HASH PASSWORD ---
    if (action === 'complete-signup') {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await sql`
        INSERT INTO users (name, email, password_hash, role) 
        VALUES (${email.split('@')[0]}, ${email}, ${passwordHash}, 'student') 
        RETURNING id, email, role
      `;

      await sql`DELETE FROM otps WHERE email = ${email}`;

      return { 
        statusCode: 201, 
        body: JSON.stringify({ success: true, message: 'Account created successfully!', user: newUser[0] }) 
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };

  } catch (error) {
    console.error('Signup Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};