import pool from "../config/database.js";

async function getProfileId(userId) {
  const result = await pool.query("SELECT id FROM profiles WHERE user_id = $1", [userId]);
  return result.rowCount > 0 ? result.rows[0].id : null;
}

export async function uploadAvatar(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  const userId = req.user.sub;
  const avatarUrl = `/uploads/${req.file.filename}`;

  try {
    const result = await pool.query(
      "UPDATE profiles SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2 RETURNING avatar_url",
      [avatarUrl, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({ message: "Avatar updated successfully", avatar_url: result.rows[0].avatar_url });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function uploadPortfolioImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  const userId = req.user.sub;
  const imageUrl = `/uploads/${req.file.filename}`;
  const { title, description } = req.body;

  try {
    const profileId = await getProfileId(userId);
    if (!profileId) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const result = await pool.query(
      `INSERT INTO provider_portfolio (profile_id, image_url, title, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, image_url, title, description, created_at`,
      [profileId, imageUrl, title || null, description || null]
    );

    res.status(201).json({
      message: "Portfolio image added successfully",
      portfolio_image: result.rows[0],
    });
  } catch (err) {
    console.error("Portfolio upload error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
