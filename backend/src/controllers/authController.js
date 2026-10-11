import bcrypt from "bcrypt";
import pool from "../config/database.js";
import { signToken } from "../utils/jwt.js";

const SALT_ROUNDS = 12;

function sanitizeUser(row) {
  const { password_hash, ...safe } = row;
  return safe;
}

export async function register(req, res) {
  const {
    email,
    phone,
    password,
    role,
    fullNameAr,
    fullNameEn,
    gender,
    dateOfBirth,
  } = req.body;

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1",
      [email, phone],
    );
    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Email or phone already registered" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const userRes = await client.query(
      `INSERT INTO users (email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, phone, role, is_verified, created_at`,
      [email, phone, passwordHash, role],
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO profiles (user_id, full_name_ar, full_name_en, gender, date_of_birth)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, fullNameAr, fullNameEn, gender || null, dateOfBirth || null],
    );

    await client.query("COMMIT");

    const token = signToken({ sub: user.id, role: user.role });

    res.status(201).json({
      message: "Registration successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch (_) { /* connection already dead */ }
    }
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (client) client.release();
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await pool.query(
      "UPDATE users SET last_login_at = NOW() WHERE id = $1",
      [user.id],
    );

    const token = signToken({ sub: user.id, role: user.role });

    res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
