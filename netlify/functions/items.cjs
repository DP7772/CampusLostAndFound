const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  // CORS & Methods check
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
      body: JSON.stringify({ error: 'Database connection string missing in Netlify environment.' })
    };
  }

  const sql = neon(dbUrl);

  try {
    const { action, payload } = JSON.parse(event.body || '{}');

    // 1. GET FEED (Purani aur nayi saari items fetch karega safely)
    if (action === 'get-feed') {
      const userEmail = payload && payload.userEmail ? payload.userEmail : null;

      // Safe fetch: Sare items seedha lost_items table se fetch karo
      const items = await sql`
        SELECT * FROM lost_items 
        ORDER BY created_at DESC
      `;

      // Agar user logged in hai, unke claims alag se check karo (Fail-safe, no crash join)
      let claimedItemIds = new Set();
      let claimStatusMap = {};

      if (userEmail) {
        try {
          const claims = await sql`
            SELECT item_id, status FROM item_claims 
            WHERE claimant_email = ${userEmail}
          `;
          claims.forEach((c) => {
            claimedItemIds.add(c.item_id);
            claimStatusMap[c.item_id] = c.status;
          });
        } catch (e) {
          console.warn('Claims table check skipped:', e.message);
        }
      }

      // Attach claim flags
      const formattedItems = items.map((item) => ({
        ...item,
        has_user_claimed: claimedItemIds.has(item.id),
        user_claim_status: claimStatusMap[item.id] || null
      }));

      // Extract unique categories & locations dynamically
      const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
      const locations = [...new Set(items.map((i) => i.location).filter(Boolean))];

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: formattedItems, categories, locations })
      };
    }

    // 2. REPORT ITEM (New post)
    if (action === 'report-item') {
      const { email, title, category, location, lostDate, lostTime, description, itemPic } = payload || {};
      
      let userId = null;
      try {
        const u = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (u.length > 0) userId = u[0].id;
      } catch (err) {
        console.warn('User lookup fallback:', err.message);
      }

      const trackingId = `LOST-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const inserted = await sql`
        INSERT INTO lost_items (
          tracking_id, user_id, student_email, title, category, location, lost_date, lost_time, description, item_pic, status
        ) VALUES (
          ${trackingId}, ${userId}, ${email}, ${title}, ${category}, ${location}, ${lostDate}, ${lostTime}, ${description}, ${itemPic}, 'available'
        ) RETURNING *
      `;

      // Safe notification broadcast
      try {
        await sql`
          INSERT INTO notifications (role, title, message, broadcast)
          VALUES (
            'all',
            ${`⚠️ Misplaced Asset: ${title}`},
            ${`Asset "${title}" was reported lost at ${location}. Tracking ID: ${trackingId}.`},
            TRUE
          )
        `;
      } catch (e) {
        console.warn('Notification log skipped:', e.message);
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, item: inserted[0] })
      };
    }

    // 3. CLAIM ITEM
    if (action === 'claim-item') {
      const { email, itemId, trackingId, proofPic, uniqueIdentifier, claimDescription } = payload || {};

      let userId = null;
      try {
        const u = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (u.length > 0) userId = u[0].id;
      } catch (err) {}

      // Prevent duplicate claims
      const existing = await sql`
        SELECT id FROM item_claims WHERE item_id = ${itemId} AND claimant_email = ${email}
      `;
      if (existing.length > 0) {
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

    // 4. NOTIFICATIONS
    if (action === 'get-notifications') {
      try {
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
      } catch (e) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifications: [] })
        };
      }
    }

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid action.' })
    };

  } catch (error) {
    console.error('API_CRASH_LOG:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Backend operation failed: ${error.message}` })
    };
  }
};
