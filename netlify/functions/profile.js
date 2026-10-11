import { neon } from '@neondatabase/serverless';

export const handler = async (event) => {
  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL;
  if (!dbUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database URL not configured' }) };
  }
  const sql = neon(dbUrl);

  try {
    const { action, email, role, profileData } = JSON.parse(event.body || '{}');

    // 1. Check if Profile is already Setup & Fetch Details
    if (action === 'get-profile') {
      let profile = [];
      if (role === 'admin') {
        profile = await sql`SELECT * FROM admin_profiles WHERE email = ${email}`;
      } else {
        profile = await sql`SELECT * FROM student_profiles WHERE email = ${email}`;
      }

      if (profile.length === 0) {
        return { statusCode: 200, body: JSON.stringify({ isSetup: false, profile: null }) };
      }

      // Fetch unread notifications
      const userRows = await sql`SELECT id FROM users WHERE email = ${email}`;
      let notifications = [];
      if (userRows.length > 0) {
        notifications = await sql`
          SELECT * FROM notifications 
          WHERE user_id = ${userRows[0].id} OR role = ${role}
          ORDER BY created_at DESC LIMIT 10
        `;
      }

      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          isSetup: true, 
          profile: profile[0],
          notifications 
        }) 
      };
    }

    // 2. Save / Update Profile
    if (action === 'save-profile') {
      const { fullName, uniqueId, phoneNo, profilePic } = profileData;

      const userRows = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (userRows.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: 'User not registered.' }) };
      }
      const userId = userRows[0].id;

      if (role === 'admin') {
        // Unique Employee ID validation
        const exists = await sql`SELECT id FROM admin_profiles WHERE emp_id = ${uniqueId} AND email != ${email}`;
        if (exists.length > 0) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Employee ID already exists. Please verify.' }) };
        }

        const saved = await sql`
          INSERT INTO admin_profiles (user_id, email, full_name, emp_id, phone_no, profile_pic)
          VALUES (${userId}, ${email}, ${fullName}, ${uniqueId}, ${phoneNo}, ${profilePic})
          ON CONFLICT (email) 
          DO UPDATE SET full_name = ${fullName}, emp_id = ${uniqueId}, phone_no = ${phoneNo}, profile_pic = ${profilePic}, updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        return { statusCode: 200, body: JSON.stringify({ success: true, profile: saved[0] }) };
      } else {
        // Unique Enrollment Number validation
        const exists = await sql`SELECT id FROM student_profiles WHERE enrollment_no = ${uniqueId} AND email != ${email}`;
        if (exists.length > 0) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Enrollment Number already in use by another student.' }) };
        }

        const saved = await sql`
          INSERT INTO student_profiles (user_id, email, full_name, enrollment_no, phone_no, profile_pic)
          VALUES (${userId}, ${email}, ${fullName}, ${uniqueId}, ${phoneNo}, ${profilePic})
          ON CONFLICT (email) 
          DO UPDATE SET full_name = ${fullName}, enrollment_no = ${uniqueId}, phone_no = ${phoneNo}, profile_pic = ${profilePic}, updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        return { statusCode: 200, body: JSON.stringify({ success: true, profile: saved[0] }) };
      }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action.' }) };
  } catch (error) {
    console.error('Profile Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: `Server error: ${error.message}` }) };
  }
};
