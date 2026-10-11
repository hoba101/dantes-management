import pool from "../config/database.js";

export async function bookAppointment(req, res) {
  const patientUserId = req.user.sub;
  const { providerId, serviceId, appointmentDate, appointmentTime, notes } = req.body;

  if (!providerId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({
      error: "providerId, appointmentDate, and appointmentTime are required",
    });
  }

  if (providerId === patientUserId) {
    return res.status(400).json({ error: "Cannot book an appointment with yourself" });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(appointmentDate)) {
    return res.status(400).json({ error: "appointmentDate must be in YYYY-MM-DD format" });
  }

  const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
  if (!timeRegex.test(appointmentTime)) {
    return res.status(400).json({ error: "appointmentTime must be in HH:MM or HH:MM:SS format" });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  if (new Date(appointmentDate) < tomorrow) {
    return res.status(400).json({ error: "appointmentDate must be at least tomorrow" });
  }

  try {
    const providerResult = await pool.query(
      "SELECT id, role, is_active FROM users WHERE id = $1",
      [providerId],
    );
    if (providerResult.rowCount === 0) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const provider = providerResult.rows[0];
    if (!provider.is_active) {
      return res.status(400).json({ error: "Provider account is not active" });
    }

    if (provider.role === "patient") {
      return res.status(400).json({ error: "Patients cannot be providers" });
    }

    if (serviceId) {
      const serviceResult = await pool.query(
        "SELECT id, name_en FROM services WHERE id = $1 AND is_active = TRUE",
        [serviceId],
      );
      if (serviceResult.rowCount === 0) {
        return res.status(404).json({ error: "Service not found" });
      }
    }

    const conflict = await pool.query(
      `SELECT id FROM appointments
       WHERE provider_id = $1
         AND appointment_date = $2
         AND appointment_time = $3
         AND status NOT IN ('cancelled', 'completed')`,
      [providerId, appointmentDate, appointmentTime],
    );
    if (conflict.rowCount > 0) {
      return res.status(409).json({ error: "Provider already has an appointment at this time" });
    }

    const result = await pool.query(
      `INSERT INTO appointments (patient_id, provider_id, service_id, appointment_date, appointment_time, patient_notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, patient_id, provider_id, service_id, appointment_date,
                 appointment_time, status, patient_notes, created_at`,
      [patientUserId, providerId, serviceId || null, appointmentDate, appointmentTime, notes || null],
    );

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: result.rows[0],
    });
  } catch (err) {
    console.error("Book appointment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMyAppointments(req, res) {
  const userId = req.user.sub;
  const role = req.user.role;
  const { status } = req.query;

  const allowedStatuses = new Set(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"]);
  if (status && !allowedStatuses.has(status)) {
    return res.status(400).json({ error: "Invalid status filter" });
  }

  try {
    let query;
    const params = [];

    if (role === "patient") {
      query = `
        SELECT
          a.id, a.appointment_date, a.appointment_time, a.status,
          a.patient_notes, a.provider_notes, a.created_at,
          a.service_id,
          s.name_en AS service_name, s.name_ar AS service_name_ar,
          json_build_object(
            'id', provider.id,
            'role', provider.role,
            'name', p.full_name_en,
            'name_ar', p.full_name_ar,
            'avatar_url', p.avatar_url
          ) AS provider
        FROM appointments a
        JOIN users provider ON provider.id = a.provider_id
        JOIN profiles p ON p.user_id = provider.id
        LEFT JOIN services s ON s.id = a.service_id
        WHERE a.patient_id = $1
      `;
      params.push(userId);
    } else {
      query = `
        SELECT
          a.id, a.appointment_date, a.appointment_time, a.status,
          a.patient_notes, a.provider_notes, a.created_at,
          a.service_id,
          s.name_en AS service_name, s.name_ar AS service_name_ar,
          json_build_object(
            'id', patient.id,
            'role', patient.role,
            'name', p.full_name_en,
            'name_ar', p.full_name_ar,
            'avatar_url', p.avatar_url
          ) AS patient
        FROM appointments a
        JOIN users patient ON patient.id = a.patient_id
        JOIN profiles p ON p.user_id = patient.id
        LEFT JOIN services s ON s.id = a.service_id
        WHERE a.provider_id = $1
      `;
      params.push(userId);
    }

    if (status) {
      const idx = params.length + 1;
      query += ` AND a.status = $${idx}`;
      params.push(status);
    }

    query += " ORDER BY a.appointment_date DESC, a.appointment_time DESC";

    const result = await pool.query(query, params);

    res.json({ appointments: result.rows });
  } catch (err) {
    console.error("Get appointments error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateAppointmentStatus(req, res) {
  const userId = req.user.sub;
  const { appointmentId } = req.params;
  const { status } = req.body;

  const validTransitions = ["confirmed", "cancelled", "completed", "in_progress", "no_show"];
  if (!status || !validTransitions.includes(status)) {
    return res.status(400).json({
      error: `Status must be one of: ${validTransitions.join(", ")}`,
    });
  }

  try {
    const appointment = await pool.query(
      "SELECT * FROM appointments WHERE id = $1",
      [appointmentId],
    );
    if (appointment.rowCount === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const appt = appointment.rows[0];

    if (appt.provider_id !== userId) {
      return res.status(403).json({ error: "Only the provider can update appointment status" });
    }

    if (appt.status === "cancelled" || appt.status === "completed") {
      return res.status(400).json({
        error: `Cannot update a ${appt.status} appointment`,
      });
    }

    if (appt.status === "pending" && status === "completed") {
      return res.status(400).json({
        error: "Cannot mark a pending appointment as completed. Confirm it first.",
      });
    }

    const result = await pool.query(
      `UPDATE appointments
       SET status = $1, provider_notes = COALESCE($2, provider_notes), updated_at = NOW()
       WHERE id = $3
       RETURNING id, patient_id, provider_id, appointment_date, appointment_time, status`,
      [status, req.body.providerNotes || null, appointmentId],
    );

    res.json({
      message: `Appointment ${status}`,
      appointment: result.rows[0],
    });
  } catch (err) {
    console.error("Update appointment status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
