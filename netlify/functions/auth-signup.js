import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL;
    if (!dbUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Database configuration missing.' }) };
    }

    const sql = neon(dbUrl);
    const body = JSON.parse(event.body || '{}');
    const { action, email, otp, password } = body;

    // --- ACTION 1: SEND OTP ---
    if (action === 'send-otp') {
      if (!email) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Email is required.' }) };
      }

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

      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Email service credentials missing.' }) };
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      // Professional Branded Email Template
      await transporter.sendMail({
        from: `"Campus Lost & Found Portal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Verification Code - Campus Lost & Found Platform',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 16px;">
            <div style="max-width: 500px; margin: auto; background: #0f1015; padding: 35px; border-radius: 20px; border: 1px solid rgba(59, 130, 246, 0.2); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              
              <div style="text-align: center; margin-bottom: 25px;">
                <span style="background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px;">Campus L&F</span>
              </div>
              
              <h2 style="color: #ffffff; text-align: center; margin-bottom: 6px; font-size: 22px;">Security Verification</h2>
              <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 0;">Official Campus Lost & Found Ecosystem</p>
              
              <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 20px 0;" />
              
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">Hello,</p>
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">You are registering your student account on the official <b>Campus Lost & Found Portal</b>. Use the secure one-time passcode below to verify your email address:</p>
              
              <div style="background: #000000; padding: 22px; text-align: center; border-radius: 14px; margin: 25px 0; border: 1px solid rgba(59, 130, 246, 0.4); box-shadow: inset 0 0 15px rgba(59, 130, 246, 0.1);">
                <span style="font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #60a5fa;">${generatedOtp}</span>
              </div>
              
              <p style="font-size: 12px; color: #f87171; text-align: center; font-weight: 600;">⚠️ This verification code is valid for 5 minutes only.</p>
              
              <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 25px 0;" />
              
              <p style="font-size: 11px; color: #64748b; text-align: center; line-height: 1.4;">
                This is an automated message sent securely by the <b>Campus L&F Authority Desk</b>.<br/>
                If you did not request this verification, please ignore this email.
              </p>
            </div>
          </div>
        `
      });

      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'OTP sent' }) };
    }

    // --- ACTION 2: VERIFY OTP ---
    if (action === 'verify-otp') {
      const records = await sql`SELECT * FROM otps WHERE email = ${email}`;
      if (records.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'OTP expired or not requested.' }) };
      }

      const record = records[0];
      if (new Date() > new Date(record.expires_at)) {
        await sql`DELETE FROM otps WHERE email = ${email}`;
        return { statusCode: 400, body: JSON.stringify({ error: 'OTP expired. Please request a new one.' }) };
      }

      if (record.otp_code !== otp) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid OTP code.' }) };
      }

      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // --- ACTION 3: COMPLETE SIGNUP ---
    if (action === 'complete-signup') {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await sql`
        INSERT INTO users (name, email, password_hash, role) 
        VALUES (${email.split('@')[0]}, ${email}, ${passwordHash}, 'student') 
        RETURNING id, email, role
      `;

      await sql`DELETE FROM otps WHERE email = ${email}`;

      return { statusCode: 201, body: JSON.stringify({ success: true, user: newUser[0] }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action specified.' }) };

  } catch (error) {
    console.error("SIGNUP ERROR:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: `Server Error: ${error.message}` }) };
  }
};
