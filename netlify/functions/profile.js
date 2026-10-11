import { neon } from '@neondatabase/serverless';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL;
  if (!dbUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database configuration missing.' }) };
  }
  const sql = neon(dbUrl);

  try {
    const { action, email, role, profileData } = JSON.parse(event.body || '{}');

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email parameter required.' }) };
    }

    // --- Check Profile Existence ---
    if (action === 'get-profile') {
      let profiles = [];
      if (role === 'admin') {
        profiles = await sql`SELECT full_name, emp_id, phone_no, profile_pic, email FROM admin_profiles WHERE email = ${email}`;
      } else {
        profiles = await sql`SELECT full_name, enrollment_no, phone_no, profile_pic, email FROM student_profiles WHERE email = ${email}`;
      }

      // Agar email database mein already present hai:
      if (profiles.length > 0 && profiles[0].full_name) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            isSetup: true,
            profile: profiles[0]
          })
        };
      }

      // Agar entry nahi hai (First-time user):
      return {
        statusCode: 200,
        body: JSON.stringify({
          isSetup: false,
          profile: null
        })
      };
    }

    // --- Save / Update Profile ---
    if (action === 'save-profile') {
      const { fullName, uniqueId, phoneNo, profilePic } = profileData;

      const userRows = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (userRows.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: 'User registration not found.' }) };
      }
      const userId = userRows[0].id;

      if (role === 'admin') {
        // Unique Employee ID check
        const idClash = await sql`SELECT id FROM admin_profiles WHERE emp_id = ${uniqueId} AND email != ${email}`;
        if (idClash.length > 0) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Employee ID already bound to another profile.' }) };
        }

        const saved = await sql`
          INSERT INTO admin_profiles (user_id, email, full_name, emp_id, phone_no, profile_pic)
          VALUES (${userId}, ${email}, ${fullName}, ${uniqueId}, ${phoneNo}, ${profilePic})
          ON CONFLICT (email) 
          DO UPDATE SET full_name = ${fullName}, emp_id = ${uniqueId}, phone_no = ${phoneNo}, profile_pic = ${profilePic}, updated_at = CURRENT_TIMESTAMP
          RETURNING full_name, emp_id, phone_no, profile_pic, email
        `;

        return { statusCode: 200, body: JSON.stringify({ success: true, profile: saved[0] }) };
      } else {
        // Unique Enrollment check
        const idClash = await sql`SELECT id FROM student_profiles WHERE enrollment_no = ${uniqueId} AND email != ${email}`;
        if (idClash.length > 0) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Enrollment Number already in use.' }) };
        }

        const saved = await sql`
          INSERT INTO student_profiles (user_id, email, full_name, enrollment_no, phone_no, profile_pic)
          VALUES (${userId}, ${email}, ${fullName}, ${uniqueId}, ${phoneNo}, ${profilePic})
          ON CONFLICT (email) 
          DO UPDATE SET full_name = ${fullName}, enrollment_no = ${uniqueId}, phone_no = ${phoneNo}, profile_pic = ${profilePic}, updated_at = CURRENT_TIMESTAMP
          RETURNING full_name, enrollment_no, phone_no, profile_pic, email
        `;

        return { statusCode: 200, body: JSON.stringify({ success: true, profile: saved[0] }) };
      }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action parameter.' }) };
  } catch (error) {
    console.error('PROFILE_ERROR:', error);
    return { statusCode: 500, body: JSON.stringify({ error: `Server error: ${error.message}` }) };
  }
};
