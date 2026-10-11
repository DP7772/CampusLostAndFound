const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL;
  if (!dbUrl) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Database configuration missing.' })
    };
  }
  const sql = neon(dbUrl);

  try {
    const { action, payload } = JSON.parse(event.body || '{}');

    // 1. Report Lost Item + Create Global Notification
    if (action === 'report-item') {
      const { email, title, category, location, lostDate, lostTime, description, itemPic } = payload;
      
      const userRows = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (userRows.length === 0) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'User not found.' })
        };
      }
      const userId = userRows[0].id;
      const trackingId = `LOST-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const inserted = await sql`
        INSERT INTO lost_items (
          tracking_id, user_id, student_email, title, category, location, lost_date, lost_time, description, item_pic, status
        ) VALUES (
          ${trackingId}, ${userId}, ${email}, ${title}, ${category}, ${location}, ${lostDate}, ${lostTime}, ${description}, ${itemPic}, 'available'
        ) RETURNING *
      `;

      // 🔔 Global Notification
      await sql`
        INSERT INTO notifications (role, title, message, broadcast)
        VALUES (
          'all',
          ${`⚠️ Misplaced Asset: ${title}`},
          ${`Asset "${title}" was reported lost at ${location}. Tracking ID: ${trackingId}.`},
          TRUE
        )
      `;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, item: inserted[0] })
      };
    }

    // 2. Fetch All Items Feed
    if (action === 'get-feed') {
      const { userEmail } = payload || {};

      let userId = null;
      if (userEmail) {
        const userRows = await sql`SELECT id FROM users WHERE email = ${userEmail}`;
        if (userRows.length > 0) userId = userRows[0].id;
      }

      const items = await sql`
        SELECT 
          l.*,
          CASE 
            WHEN c.id IS NOT NULL THEN true 
            ELSE false 
          END AS has_user_claimed,
          c.status AS user_claim_status
        FROM lost_items l
        LEFT JOIN item_claims c ON l.id = c.item_id AND c.claimant_id = ${userId}
        ORDER BY l.created_at DESC
      `;

      const categories = [...new Set(items.map((i) => i.category))];
      const locations = [...new Set(items.map((i) => i.location))];

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, categories, locations })
      };
    }

    // 3. Submit Claim on an Item
    if (action === 'claim-item') {
      const { email, itemId, trackingId, proofPic, uniqueIdentifier, claimDescription } = payload;

      const userRows = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (userRows.length === 0) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'User session invalid.' })
        };
      }
      const userId = userRows[0].id;

      const existingClaim = await sql`
        SELECT id FROM item_claims WHERE item_id = ${itemId} AND claimant_id = ${userId}
      `;
      if (existingClaim.length > 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'You have already submitted a claim for this item.' })
        };
      }

      const claim = await sql`
        INSERT INTO item_claims (
          item_id, tracking_id, claimant_id, claimant_email, proof_pic, unique_identifier, claim_description, status
        ) VALUES (
          ${itemId}, ${trackingId}, ${userId}, ${email}, ${proofPic}, ${uniqueIdentifier}, ${claimDescription}, 'pending'
        ) RETURNING *
      `;

      await sql`
        UPDATE lost_items 
        SET status = 'claim_pending' 
        WHERE id = ${itemId} AND status = 'available'
      `;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, claim: claim[0] })
      };
    }

    // 4. Admin Approves a Claim
    if (action === 'admin-approve-claim') {
      const { claimId, itemId } = payload;

      const claimData = await sql`
        SELECT c.*, sp.full_name, sp.enrollment_no 
        FROM item_claims c
        LEFT JOIN student_profiles sp ON c.claimant_email = sp.email
        WHERE c.id = ${claimId}
      `;

      if (claimData.length === 0) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Claim record not found.' })
        };
      }
      const claim = claimData[0];

      const itemData = await sql`SELECT title, tracking_id FROM lost_items WHERE id = ${itemId}`;
      const itemTitle = itemData[0]?.title || 'Misplaced Asset';

      await sql`UPDATE item_claims SET status = 'approved' WHERE id = ${claimId}`;
      await sql`UPDATE item_claims SET status = 'rejected' WHERE item_id = ${itemId} AND id != ${claimId}`;

      await sql`
        UPDATE lost_items 
        SET 
          status = 'resolved',
          approved_claimant_id = ${claim.claimant_id},
          approved_claimant_name = ${claim.full_name || 'Verified Student'},
          approved_claimant_enrollment = ${claim.enrollment_no || 'N/A'},
          approved_claimant_proof = ${claim.proof_pic},
          resolved_at = CURRENT_TIMESTAMP
        WHERE id = ${itemId}
      `;

      await sql`
        INSERT INTO notifications (role, title, message, broadcast)
        VALUES (
          'all',
          ${`🎉 Asset Recovered: ${itemTitle}`},
          ${`Asset "${itemTitle}" (${itemData[0]?.tracking_id}) has been verified & returned to ${claim.full_name \vert{}\vert{} 'Claimant'} (Enr:${claim.enrollment_no || 'N/A'}).`},
          TRUE
        )
      `;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    // 5. Fetch Live Notification Feed
    if (action === 'get-notifications') {
      const notifications = await sql`
        SELECT * FROM notifications 
        ORDER BY created_at DESC 
        LIMIT 20
      `;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications })
      };
    }

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid action.' })
    };
  } catch (error) {
    console.error('ITEMS_API_ERROR:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
