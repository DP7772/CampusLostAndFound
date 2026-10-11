import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { action, email, otp, password } = JSON.parse(event.body);

    // Check Env Variables
    if (!process.env.NETLIFY_DATABASE_URL && !process.env.NETLIFY_DATABASE_URL_UNPOOLED) {
      throw new Error("Database URL environment variable is missing on Netlify!");
    }

    const sql = neon(process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL);

    if (action === 'send-otp') {
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
        throw new Error("Email credentials (EMAIL_USER / EMAIL_PASS) are missing on Netlify!");
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      await transporter.sendMail({
        from: `"Campus L&F" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔒 Your Verification OTP',
        html: `<h3>Your OTP is: <b>${generatedOtp}</b></h3>`
      });

      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'OTP sent' }) };
    }

    if (action === 'verify-otp') {
      const records = await sql`SELECT * FROM otps WHERE email = ${email}`;
      if (records.length === 0 || records[0].otp_code !== otp) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or expired OTP.' }) };
      }
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

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

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };

  } catch (error) {
    console.error("SIGNUP CRITICAL ERROR:", error.message);
    // Yeh error seedha browser console aur UI red box mein dikhega!
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: `Server Crash: ${error.message}` }) 
    };
  }
};
