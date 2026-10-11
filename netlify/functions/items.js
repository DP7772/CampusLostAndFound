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
    const { action, payload } = JSON.parse(event.body || '{}');

    // 1. Report Lost Item
    if (action === 'report-item') {
      const { email, title, category, location, lostDate, lostTime, description, itemPic } = payload;
      
      const userRows = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (userRows.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: 'User not found.' }) };
      }
      const userId = userRows[0].id;

      // Generate Sci-Fi Tracking ID: LOST-YEAR-RANDOM
      const trackingId = `LOST-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const inserted = await sql`
        INSERT INTO lost_items (
          tracking_id, user_id, student_email, title, category, location, lost_date, lost_time, description, item_pic
        ) VALUES (
          ${trackingId}, ${userId}, ${email}, ${title}, ${category}, ${location}, ${lostDate}, ${lostTime}, ${description}, ${itemPic}
        ) RETURNING *
      `;

      return { statusCode: 200, body: JSON.stringify({ success: true, item: inserted[0] }) };
    }

    // 2. Fetch All Items Feed with Dynamic Distinct Filters
    if (action === 'get-feed') {
      const { userEmail } = payload;

      // Get user id to check if already claimed
      const userRows = await sql`SELECT id FROM users WHERE email = ${userEmail}`;
      const userId = userRows.length > 0 ? userRows[0].id : null;

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

      // Extract unique categories and locations from currently reported items
      const categories = [...new Set(items.map((i) => i.category))];
      const locations = [...new Set(items.map((i) => i.location))];

      return {
        statusCode: 200,
        body: JSON.stringify({ items, categories, locations })
      };
    }

    // 3. Submit Claim on an Item
    if (action === 'claim-item') {
      const { email, itemId, trackingId, proofPic, uniqueIdentifier, claimDescription } = payload;

      const userRows = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (userRows.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: 'User session invalid.' }) };
      }
      const userId = userRows[0].id;

      // Duplicate check: Verify user hasn't already submitted a claim for this item
      const existingClaim = await sql`
        SELECT id FROM item_claims WHERE item_id = ${itemId} AND claimant_id = ${userId}
      `;
      if (existingClaim.length > 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'You have already submitted a claim for this item.' }) };
      }

      // Record the claim
      const claim = await sql`
        INSERT INTO item_claims (
          item_id, tracking_id, claimant_id, claimant_email, proof_pic, unique_identifier, claim_description
        ) VALUES (
          ${itemId}, ${trackingId}, ${userId}, ${email}, ${proofPic}, ${uniqueIdentifier}, ${claimDescription}
        ) RETURNING *
      `;

      // Update item status to claim_pending
      await sql`
        UPDATE lost_items 
        SET status = 'claim_pending' 
        WHERE id = ${itemId} AND status = 'available'
      `;

      return { statusCode: 200, body: JSON.stringify({ success: true, claim: claim[0] }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action.' }) };
  } catch (error) {
    console.error('ITEMS_API_ERROR:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
