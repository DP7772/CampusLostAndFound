const { neon } = require('@neondatabase/serverless');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const dbUrl = 
    process.env.NETLIFY_DATABASE_URL_UNPOOLED || 
    process.env.NETLIFY_DATABASE_URL || 
    process.env.DATABASE_URL;

  if (!dbUrl) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: 'Database URL missing from environment.', items: [], notifications: [] })
    };
  }

  const sql = neon(dbUrl);

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action || '';
    const payload = body.payload || {};

    // 1. GET NOTIFICATIONS (IST +05:30)
    if (action === 'get-notifications') {
      try {
        const notifications = await sql`
          SELECT 
            id, 
            role, 
            title, 
            message, 
            broadcast, 
            to_char(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM, DD Mon') AS created_at
          FROM notifications 
          ORDER BY id DESC 
          LIMIT 30
        `;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ notifications: notifications || [] })
        };
      } catch (err) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ notifications: [], dbError: err.message })
        };
      }
    }

    // 2. GET FEED ITEMS
    if (action === 'get-feed') {
      try {
        const items = await sql`
          SELECT * FROM lost_items 
          ORDER BY id DESC 
          LIMIT 100
        `;

        let claimedItemIds = new Set();
        let claimStatusMap = {};

        if (payload.userEmail) {
          try {
            const claims = await sql`
              SELECT item_id, status FROM item_claims 
              WHERE claimant_email = ${payload.userEmail}
            `;
            (claims || []).forEach((c) => {
              claimedItemIds.add(c.item_id);
              claimStatusMap[c.item_id] = c.status;
            });
          } catch (e) {}
        }

        const formattedItems = (items || []).map((item) => ({
          ...item,
          has_user_claimed: claimedItemIds.has(item.id),
          user_claim_status: claimStatusMap[item.id] || null
        }));

        const categories = [...new Set((items || []).map((i) => i.category).filter(Boolean))];
        const locations = [...new Set((items || []).map((i) => i.location).filter(Boolean))];

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ items: formattedItems, categories, locations })
        };
      } catch (feedErr) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ items: [], categories: [], locations: [], warning: feedErr.message })
        };
      }
    }

    // 3. REPORT ITEM (Student reports lost asset -> Broadcast & Admin notification)
    if (action === 'report-item') {
      const { email, title, category, location, lostDate, lostTime, description, itemPic } = payload;
      const trackingId = `LOST-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      let userId = null;
      try {
        const u = await sql`SELECT id FROM users WHERE email = ${email || ''} LIMIT 1`;
        if (u && u.length > 0) userId = u[0].id;
      } catch (err) {}

      const inserted = await sql`
        INSERT INTO lost_items (
          tracking_id, user_id, student_email, title, category, location, lost_date, lost_time, description, item_pic, status
        ) VALUES (
          ${trackingId}, ${userId}, ${email || ''}, ${title || 'Misplaced Asset'}, ${category || 'GENERAL'}, ${location || 'Campus'}, ${lostDate || ''}, ${lostTime || ''}, ${description || ''}, ${itemPic || ''}, 'available'
        ) RETURNING *
      `;

      // 🔔 Broadcast Alert
      await sql`
        INSERT INTO notifications (role, title, message, broadcast)
        VALUES (
          'all',
          ${'⚠️ Asset Alert: ' + (title || 'New Item')},
          ${'Reported lost at ' + (location || 'Campus') + ' (ID: ' + trackingId + ')'},
          TRUE
        )
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, item: inserted[0] })
      };
    }

    // 4. CLAIM ITEM (Student files claim -> Trigger claim notification for admin)
    if (action === 'claim-item') {
      const { email, itemId, trackingId, proofPic, uniqueIdentifier, claimDescription } = payload;

      let userId = null;
      try {
        const u = await sql`SELECT id FROM users WHERE email = ${email || ''} LIMIT 1`;
        if (u && u.length > 0) userId = u[0].id;
      } catch (err) {}

      const existing = await sql`
        SELECT id FROM item_claims WHERE item_id = ${itemId} AND claimant_email = ${email}
      `;
      if (existing && existing.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'You have already submitted a claim for this item.' })
        };
      }

      const claim = await sql`
        INSERT INTO item_claims (
          item_id, tracking_id, claimant_id, claimant_email, proof_pic, unique_identifier, claim_description, status
        ) VALUES (
          ${itemId}, ${trackingId}, ${userId}, ${email}, ${proofPic || ''}, ${uniqueIdentifier || ''}, ${claimDescription || ''}, 'pending'
        ) RETURNING *
      `;

      await sql`
        UPDATE lost_items 
        SET status = 'claim_pending' 
        WHERE id = ${itemId} AND status = 'available'
      `;

      // 🔔 Notification for Admin about the incoming claim
      const itemRow = await sql`SELECT title FROM lost_items WHERE id = ${itemId}`;
      const itemTitle = itemRow[0]?.title || trackingId;

      await sql`
        INSERT INTO notifications (role, title, message, broadcast)
        VALUES (
          'admin',
          ${'📩 New Claim Filed: ' + itemTitle},
          ${'Claim submitted by ' + email + ' for review.'},
          TRUE
        )
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, claim: claim[0] })
      };
    }

    // 5. FETCH CLAIMS FOR AN ITEM (For Admin YouTube Theater View)
    if (action === 'get-item-claims') {
      const { itemId } = payload;
      const claims = await sql`
        SELECT 
          c.*, 
          COALESCE(sp.full_name, 'Student') AS full_name,
          COALESCE(sp.enrollment_no, 'Not Set') AS enrollment_no,
          to_char(c.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM, DD Mon') AS submitted_time
        FROM item_claims c
        LEFT JOIN student_profiles sp ON c.claimant_email = sp.email
        WHERE c.item_id = ${itemId}
        ORDER BY c.id DESC
      `;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ claims })
      };
    }

   // 6. ADMIN APPROVE OR REJECT SPECIFIC CLAIM
    if (action === 'admin-process-claim') {
      const { claimId, itemId, decision } = payload;

      if (decision === 'reject') {
        await sql`UPDATE item_claims SET status = 'rejected' WHERE id = ${claimId}`;
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Claim discarded.' }) };
      }

      if (decision === 'approve') {
        const claimData = await sql`
          SELECT c.*, sp.full_name, sp.enrollment_no 
          FROM item_claims c
          LEFT JOIN student_profiles sp ON c.claimant_email = sp.email
          WHERE c.id = ${claimId}
        `;
        const claim = claimData && claimData[0] ? claimData[0] : {};
        const itemData = await sql`SELECT title, tracking_id FROM lost_items WHERE id = ${itemId}`;
        const itemTitle = itemData[0]?.title || 'Misplaced Asset';

        // 1. Finder's claim approve
        await sql`UPDATE item_claims SET status = 'approved' WHERE id = ${claimId}`;
        
        // 2. Reject others
        await sql`UPDATE item_claims SET status = 'rejected' WHERE item_id = ${itemId} AND id != ${claimId}`;

        // 3. Mark lost item as RECOVERED / FOUND
        await sql`
          UPDATE lost_items 
          SET 
            status = 'resolved',
            approved_claimant_id = ${claim.claimant_id || null},
            approved_claimant_name = ${claim.full_name || 'Verified Student'},
            approved_claimant_enrollment = ${claim.enrollment_no || 'N/A'},
            approved_claimant_proof = ${claim.proof_pic || ''},
            resolved_at = CURRENT_TIMESTAMP
          WHERE id = ${itemId}
        `;

        // 🔔 4. Sahi Broadcast: "Found & Recovered By [Student]" (Handed over by student)
        await sql`
          INSERT INTO notifications (role, title, message, broadcast)
          VALUES (
            'all',
            ${'✅ Asset Recovered: ' + itemTitle},
            ${'Successfully found and handed in by ' + (claim.full_name || 'Student') + ' (Enr: ' + (claim.enrollment_no || 'Verified') + ')'},
            TRUE
          )
        `;

        return { 
          statusCode: 200, 
          headers, 
          body: JSON.stringify({ 
            success: true, 
            message: `Verified! Item successfully recovered by ${claim.full_name || 'Student'}.` 
          }) 
        };
      }
    }

    // 7. DIRECT USER ONBOARDING (Admin registers Student or Admin without OTP)
    if (action === 'admin-create-user') {
      const { email, password, role, fullName, phone, identifier } = payload; // identifier = enrollment_no | emp_id

      const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existing.length > 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'User with this email already exists.' }) };
      }

      // Insert User
      const newUser = await sql`
        INSERT INTO users (email, password, role)
        VALUES (${email}, ${password}, ${role})
        RETURNING id
      `;
      const userId = newUser[0].id;

      // Seed Profile
      if (role === 'student') {
        await sql`
          INSERT INTO student_profiles (user_id, email, full_name, enrollment_no, phone_no, profile_pic)
          VALUES (${userId}, ${email}, ${fullName}, ${identifier}, ${phone}, 'https://api.dicebear.com/7.x/bottts/svg?seed=' || ${email})
        `;
      } else {
        await sql`
          INSERT INTO admin_profiles (user_id, email, full_name, emp_id, phone_no, profile_pic)
          VALUES (${userId}, ${email}, ${fullName}, ${identifier}, ${phone}, 'https://api.dicebear.com/7.x/identicon/svg?seed=' || ${email})
        `;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `${role.toUpperCase()} registered successfully.` })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action specified' }) };
  } catch (globalErr) {
    console.error('CRITICAL ERROR:', globalErr.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items: [], notifications: [], warning: globalErr.message })
    };
  }
};
