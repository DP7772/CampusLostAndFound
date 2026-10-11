import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
    const { email, password, portalType } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email and password are required.' }) };
    }

    // Check if user exists in database
    const users = await sql`SELECT id, name, email, role, password_hash FROM users WHERE email = ${email}`;

    if (users.length === 0) {
      if (portalType === 'admin') {
        return { statusCode: 401, body: JSON.stringify({ error: 'Account not found. Please contact technical head.' }) };
      } else {
        return { statusCode: 401, body: JSON.stringify({ error: 'Email does not exist. Please sign up first.' }) };
      }
    }

    const user = users[0];

    // Role-based validation
    if (portalType === 'admin' && user.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Access denied. You do not have admin privileges.' }) };
    }

    if (portalType === 'student' && user.role !== 'student' && user.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Invalid portal. Please use the appropriate login.' }) };
    }

    // Password comparison using bcryptjs
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect password. Please try again.' }) };
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '24h' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      })
    };

  } catch (error) {
    console.error("LOGIN ERROR:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: `Server Error: ${error.message}` }) };
  }
};
