import pool from "../config/database.js";

async function getDoctorProfileId(userId) {
  const result = await pool.query(
    `SELECT dp.id FROM doctor_profiles dp
     JOIN profiles p ON p.id = dp.profile_id
     WHERE p.user_id = $1`,
    [userId],
  );
  return result.rowCount > 0 ? result.rows[0].id : null;
}

export async function listMyServices(req, res) {
  const doctorId = await getDoctorProfileId(req.user.sub);
  if (!doctorId) return res.status(404).json({ error: "Doctor profile not found" });

  try {
    const result = await pool.query(
      `SELECT
         dsp.id AS price_id, dsp.price, dsp.is_available,
         s.id AS service_id, s.name_ar, s.name_en,
         s.description_ar, s.description_en, s.category,
         s.estimated_duration_mins
       FROM doctor_service_prices dsp
       JOIN services s ON s.id = dsp.service_id
       WHERE dsp.doctor_id = $1 AND s.is_active = TRUE
       ORDER BY s.category, s.name_en`,
      [doctorId],
    );
    res.json({ services: result.rows });
  } catch (err) {
    console.error("List services error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function addService(req, res) {
  const doctorId = await getDoctorProfileId(req.user.sub);
  if (!doctorId) return res.status(404).json({ error: "Doctor profile not found" });

  const { serviceId, price } = req.body;

  if (!serviceId || price === undefined || price < 0) {
    return res.status(400).json({ error: "serviceId and non-negative price are required" });
  }

  try {
    const catalogCheck = await pool.query(
      "SELECT id, name_en FROM services WHERE id = $1 AND is_active = TRUE",
      [serviceId],
    );
    if (catalogCheck.rowCount === 0) {
      return res.status(404).json({ error: "Service not found in catalog" });
    }

    const existing = await pool.query(
      "SELECT id FROM doctor_service_prices WHERE doctor_id = $1 AND service_id = $2",
      [doctorId, serviceId],
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Service already added. Use PUT to update." });
    }

    const result = await pool.query(
      `INSERT INTO doctor_service_prices (doctor_id, service_id, price)
       VALUES ($1, $2, $3)
       RETURNING id, price, is_available, created_at`,
      [doctorId, serviceId, price],
    );

    res.status(201).json({
      message: "Service added",
      servicePrice: result.rows[0],
      service: catalogCheck.rows[0],
    });
  } catch (err) {
    console.error("Add service error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateServicePrice(req, res) {
  const doctorId = await getDoctorProfileId(req.user.sub);
  if (!doctorId) return res.status(404).json({ error: "Doctor profile not found" });

  const { priceId } = req.params;
  const { price, isAvailable } = req.body;

  if (price !== undefined && price < 0) {
    return res.status(400).json({ error: "Price must be non-negative" });
  }

  try {
    const ownership = await pool.query(
      "SELECT id FROM doctor_service_prices WHERE id = $1 AND doctor_id = $2",
      [priceId, doctorId],
    );
    if (ownership.rowCount === 0) {
      return res.status(404).json({ error: "Service price record not found" });
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (price !== undefined) { fields.push(`price = $${idx++}`); params.push(price); }
    if (isAvailable !== undefined) { fields.push(`is_available = $${idx++}`); params.push(isAvailable); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    params.push(priceId);
    const result = await pool.query(
      `UPDATE doctor_service_prices SET ${fields.join(", ")} WHERE id = $${idx}
       RETURNING id, price, is_available, updated_at`,
      params,
    );

    res.json({ message: "Service updated", servicePrice: result.rows[0] });
  } catch (err) {
    console.error("Update service error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function removeService(req, res) {
  const doctorId = await getDoctorProfileId(req.user.sub);
  if (!doctorId) return res.status(404).json({ error: "Doctor profile not found" });

  const { priceId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM doctor_service_prices WHERE id = $1 AND doctor_id = $2 RETURNING id",
      [priceId, doctorId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Service price record not found" });
    }

    res.json({ message: "Service removed" });
  } catch (err) {
    console.error("Remove service error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function listCatalog(req, res) {
  const { category } = req.query;

  try {
    let query = "SELECT id, name_ar, name_en, category, estimated_duration_mins, requires_supervision FROM services WHERE is_active = TRUE";
    const params = [];

    if (category) {
      query += " AND category = $1";
      params.push(category);
    }

    query += " ORDER BY category, name_en";

    const result = await pool.query(query, params);
    res.json({ services: result.rows });
  } catch (err) {
    console.error("List catalog error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
