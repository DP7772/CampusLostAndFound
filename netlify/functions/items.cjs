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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL;
  if (!dbUrl) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: 'DB configuration missing', items: [], notifications: [] })
    };
  }

  let sql;
  try {
    sql = neon(dbUrl);
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: 'DB Driver init failed', items: [], notifications: [] })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action || '';
    const payload = body.payload || {};

    // 1. GET FEED (Safe fallback: agar table mein query fail bhi ho toh 200 return karega)
    if (action === 'get-feed') {
      try {
        const items = await sql`
          SELECT * FROM lost_items 
          ORDER BY created_at DESC 
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
          } catch (e) {
            console.warn('Claims check warning:', e.message);
          }
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
        console.error('get-feed SQL failed:', feedErr.message);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ items: [], categories: [], locations: [], warning: feedErr.message })
        };
      }
    }

    // 2. REPORT ITEM
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

      try {
        await sql`
          INSERT INTO notifications (role, title, message, broadcast)
          VALUES (
            'all',
            ${'⚠️ Asset Alert: ' + (title || 'New Item')},
            ${'Reported at ' + (location || 'Campus') + ' (ID: ' + trackingId + ')'},
            TRUE
          )
        `;
      } catch (e) {}

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, item: inserted[0] })
      };
    }

    // 3. CLAIM ITEM
    if (action === 'claim-item') {
      const { email, itemId, trackingId, proofPic, uniqueIdentifier, claimDescription } = payload;

      let userId = null;
      try {
        const u = await sql`SELECT id FROM users WHERE email = ${email || ''} LIMIT 1`;
        if (u && u.length > 0) userId = u[0].id;
      } catch (err) {}

      try {
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

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, claim: claim[0] })
        };
      } catch (claimErr) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: claimErr.message })
        };
      }
    }

    // 4. ADMIN APPROVE CLAIM
    if (action === 'admin-approve-claim') {
      const { claimId, itemId } = payload;

      try {
        const claimData = await sql`
          SELECT c.*, sp.full_name, sp.enrollment_no 
          FROM item_claims c
          LEFT JOIN student_profiles sp ON c.claimant_email = sp.email
          WHERE c.id = ${claimId}
        `;

        const claim = claimData && claimData[0] ? claimData[0] : {};
        const itemData = await sql`SELECT title, tracking_id FROM lost_items WHERE id = ${itemId}`;
        const itemTitle = itemData[0]?.title || 'Misplaced Asset';

        await sql`UPDATE item_claims SET status = 'approved' WHERE id = ${claimId}`;
        await sql`UPDATE item_claims SET status = 'rejected' WHERE item_id = ${itemId} AND id != ${claimId}`;

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

        await sql`
          INSERT INTO notifications (role, title, message, broadcast)
          VALUES (
            'all',
            ${'🎉 Resolved: ' + itemTitle},
            ${'Handed over to ' + (claim.full_name || 'Claimant') + ' (' + (claim.enrollment_no || 'Verified') + ')'},
            TRUE
          )
        `;

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
      }
    }

    // 5. GET NOTIFICATIONS
    if (action === 'get-notifications') {
      try {
        const notifications = await sql`
          SELECT * FROM notifications 
          ORDER BY created_at DESC 
          LIMIT 25
        `;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ notifications: notifications || [] })
        };
      } catch (e) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ notifications: [] })
        };
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Unknown action specified' })
    };

  } catch (globalErr) {
    console.error('CRITICAL FUNCTION ERROR:', globalErr.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items: [], notifications: [], warning: globalErr.message })
    };
  }
};
