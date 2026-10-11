import pool from "../config/database.js";

async function getStudentProfileId(userId) {
  const result = await pool.query(
    `SELECT sp.id FROM student_profiles sp
     JOIN profiles p ON p.id = sp.profile_id
     WHERE p.user_id = $1`,
    [userId],
  );
  return result.rowCount > 0 ? result.rows[0].id : null;
}

export async function updateProfile(req, res) {
  const userId = req.user.sub;
  const { latitude, longitude } = req.body;

  try {
    const fields = [];
    const params = [];
    let idx = 1;

    if (latitude !== undefined) { fields.push(`latitude = $${idx++}`); params.push(latitude); }
    if (longitude !== undefined) { fields.push(`longitude = $${idx++}`); params.push(longitude); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update. Provide latitude and/or longitude." });
    }

    params.push(userId);
    await pool.query(
      `UPDATE profiles SET ${fields.join(", ")} WHERE user_id = $${idx}`,
      params,
    );

    const profile = await pool.query(
      `SELECT p.latitude, p.longitude,
              sp.id, sp.university, sp.academic_year
       FROM profiles p
       JOIN student_profiles sp ON sp.profile_id = p.id
       WHERE p.user_id = $1`,
      [userId],
    );

    res.json({ message: "Profile updated", profile: profile.rows[0] });
  } catch (err) {
    console.error("Student profile update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createCaseRequest(req, res) {
  const studentId = await getStudentProfileId(req.user.sub);
  if (!studentId) {
    return res.status(404).json({ error: "Student profile not found" });
  }

  const { serviceId, materialsFee, supervisingDoctorId, notes } = req.body;

  if (!serviceId) {
    return res.status(400).json({ error: "serviceId is required" });
  }

  try {
    const catalogCheck = await pool.query(
      "SELECT id, name_en, requires_supervision FROM services WHERE id = $1 AND is_active = TRUE",
      [serviceId],
    );
    if (catalogCheck.rowCount === 0) {
      return res.status(404).json({ error: "Service not found in catalog" });
    }

    if (
      catalogCheck.rows[0].requires_supervision &&
      !supervisingDoctorId
    ) {
      return res.status(400).json({
        error: "This procedure requires a supervising doctor. Provide supervisingDoctorId.",
      });
    }

    const existing = await pool.query(
      `SELECT id FROM student_service_offerings
       WHERE student_id = $1 AND service_id = $2`,
      [studentId, serviceId],
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: "You already have an active offering for this service. Use PUT to update.",
      });
    }

    const result = await pool.query(
      `INSERT INTO student_service_offerings
         (student_id, service_id, materials_fee, supervising_doctor_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, service_id, materials_fee, supervising_doctor_id,
                 is_available, created_at`,
      [
        studentId,
        serviceId,
        materialsFee ?? 0,
        supervisingDoctorId || null,
      ],
    );

    res.status(201).json({
      message: "Case request posted successfully",
      caseRequest: {
        ...result.rows[0],
        notes: notes || null,
        service: catalogCheck.rows[0],
      },
    });
  } catch (err) {
    console.error("Create case request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function listMyCaseRequests(req, res) {
  const studentId = await getStudentProfileId(req.user.sub);
  if (!studentId) {
    return res.status(404).json({ error: "Student profile not found" });
  }

  try {
    const result = await pool.query(
      `SELECT
         sso.id, sso.service_id, sso.materials_fee,
         sso.supervising_doctor_id, sso.is_available, sso.created_at,
         s.name_ar AS service_name_ar, s.name_en AS service_name_en,
         s.category, s.estimated_duration_mins,
         json_build_object(
           'id', dp.id, 'name', p2.full_name_en
         ) AS supervising_doctor
       FROM student_service_offerings sso
       JOIN services s ON s.id = sso.service_id
       LEFT JOIN doctor_profiles dp ON dp.id = sso.supervising_doctor_id
       LEFT JOIN profiles p2 ON p2.id = dp.profile_id
       WHERE sso.student_id = $1
       ORDER BY sso.created_at DESC`,
      [studentId],
    );

    res.json({ caseRequests: result.rows });
  } catch (err) {
    console.error("List case requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateCaseRequest(req, res) {
  const studentId = await getStudentProfileId(req.user.sub);
  if (!studentId) {
    return res.status(404).json({ error: "Student profile not found" });
  }

  const { offeringId } = req.params;
  const { materialsFee, isAvailable, supervisingDoctorId } = req.body;

  try {
    const ownership = await pool.query(
      "SELECT id FROM student_service_offerings WHERE id = $1 AND student_id = $2",
      [offeringId, studentId],
    );
    if (ownership.rowCount === 0) {
      return res.status(404).json({ error: "Case request not found" });
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (materialsFee !== undefined) { fields.push(`materials_fee = $${idx++}`); params.push(materialsFee); }
    if (isAvailable !== undefined) { fields.push(`is_available = $${idx++}`); params.push(isAvailable); }
    if (supervisingDoctorId !== undefined) { fields.push(`supervising_doctor_id = $${idx++}`); params.push(supervisingDoctorId); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    params.push(offeringId);
    const result = await pool.query(
      `UPDATE student_service_offerings SET ${fields.join(", ")} WHERE id = $${idx}
       RETURNING id, service_id, materials_fee, supervising_doctor_id, is_available, updated_at`,
      params,
    );

    res.json({ message: "Case request updated", caseRequest: result.rows[0] });
  } catch (err) {
    console.error("Update case request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteCaseRequest(req, res) {
  const studentId = await getStudentProfileId(req.user.sub);
  if (!studentId) {
    return res.status(404).json({ error: "Student profile not found" });
  }

  const { offeringId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM student_service_offerings WHERE id = $1 AND student_id = $2 RETURNING id",
      [offeringId, studentId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Case request not found" });
    }

    res.json({ message: "Case request removed" });
  } catch (err) {
    console.error("Delete case request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
