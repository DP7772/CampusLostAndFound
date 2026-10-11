import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // 1. Safe Environment Check inside handler
    const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL;
    if (!dbUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Database URL environment variable is missing on Netlify!' }) };
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
        return { statusCode: 400, body: JSON.stringify({ error: 'Email already registered.' }) };
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
        return { statusCode: 500, body: JSON.stringify({ error: 'Email credentials missing on Netlify!' }) };
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      await transporter.sendMail({
        from: `"Campus L&F" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔒 Your Verification OTP',
        html: `<h3>Your OTP is: <b>${generatedOtp}</b></h3><p>Valid for 5 minutes.</p>`
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
        return { statusCode: 400, body: JSON.stringify({ error: 'OTP expired.' }) };
      }

      if (record.otp_code !== otp) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid OTP.' }) };
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
    // Ab 502 ke bajaye exact error frontend par JSON mein jayega
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: `Server Error: ${error.message}` }) 
    };
  }
};
