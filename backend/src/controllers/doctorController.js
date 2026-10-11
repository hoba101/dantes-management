import pool from "../config/database.js";

export async function updateProfile(req, res) {
  const userId = req.user.sub;
  const {
    bioAr,
    bioEn,
    consultationFee,
    isAcceptingPatients,
    licenseNumber,
    yearsOfExperience,
    clinicName,
    clinicAddress,
    governorateId,
    lat,
    lng,
  } = req.body;

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const profileRes = await client.query(
      `SELECT p.id, dp.id AS doctor_profile_id
       FROM profiles p
       JOIN doctor_profiles dp ON dp.profile_id = p.id
       WHERE p.user_id = $1`,
      [userId],
    );

    if (profileRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Doctor profile not found" });
    }

    const { doctor_profile_id: doctorProfileId } = profileRes.rows[0];

    const fields = [];
    const params = [];
    let idx = 1;

    if (bioAr !== undefined) { fields.push(`bio_ar = $${idx++}`); params.push(bioAr); }
    if (bioEn !== undefined) { fields.push(`bio_en = $${idx++}`); params.push(bioEn); }
    if (consultationFee !== undefined) { fields.push(`consultation_fee = $${idx++}`); params.push(consultationFee); }
    if (isAcceptingPatients !== undefined) { fields.push(`is_accepting_patients = $${idx++}`); params.push(isAcceptingPatients); }
    if (licenseNumber !== undefined) { fields.push(`license_number = $${idx++}`); params.push(licenseNumber); }
    if (yearsOfExperience !== undefined) { fields.push(`years_of_experience = $${idx++}`); params.push(yearsOfExperience); }

    if (fields.length > 0) {
      params.push(doctorProfileId);
      await client.query(
        `UPDATE doctor_profiles SET ${fields.join(", ")} WHERE id = $${idx}`,
        params,
      );
    }

    if (lat !== undefined || lng !== undefined) {
      const locFields = [];
      const locParams = [];
      let locIdx = 1;
      if (lat !== undefined) { locFields.push(`latitude = $${locIdx++}`); locParams.push(lat); }
      if (lng !== undefined) { locFields.push(`longitude = $${locIdx++}`); locParams.push(lng); }
      locParams.push(userId);
      await client.query(
        `UPDATE profiles SET ${locFields.join(", ")} WHERE user_id = $${locIdx}`,
        locParams,
      );
    }

    if (clinicName || clinicAddress) {
      const clinicRes = await client.query(
        `SELECT id FROM clinic_locations
         WHERE doctor_id = $1 AND is_primary = TRUE
         LIMIT 1`,
        [doctorProfileId],
      );

      const clinicFields = [];
      const clinicParams = [];
      let cidx = 1;

      if (clinicName !== undefined) { clinicFields.push(`name_en = $${cidx++}`); clinicParams.push(clinicName); }
      if (clinicAddress !== undefined) { clinicFields.push(`address = $${cidx++}`); clinicParams.push(clinicAddress); }
      if (governorateId !== undefined) { clinicFields.push(`governorate_id = $${cidx++}`); clinicParams.push(governorateId); }
      if (lat !== undefined) { clinicFields.push(`lat = $${cidx++}`); clinicParams.push(lat); }
      if (lng !== undefined) { clinicFields.push(`lng = $${cidx++}`); clinicParams.push(lng); }

      if (clinicFields.length > 0 && clinicRes.rowCount > 0) {
        clinicParams.push(clinicRes.rows[0].id);
        await client.query(
          `UPDATE clinic_locations SET ${clinicFields.join(", ")} WHERE id = $${cidx}`,
          clinicParams,
        );
      } else if (clinicFields.length > 0) {
        clinicParams.unshift(doctorProfileId);
        await client.query(
          `INSERT INTO clinic_locations (doctor_id, name_en, address ${governorateId ? ", governorate_id" : ""} ${lat ? ", lat" : ""} ${lng ? ", lng" : ""} ${clinicName ? "" : ", name_en"} ${clinicAddress ? "" : ", address"})
           VALUES ($$1, $${clinicName ? 2 : 2}, $${clinicAddress ? 3 : 2})`,
          [doctorProfileId, clinicName || "Main Clinic", clinicAddress || "TBD"],
        );
      }
    }

    await client.query("COMMIT");

    const updated = await pool.query(
      `SELECT
        dp.id, dp.license_number, dp.license_verified,
        dp.years_of_experience, dp.bio_ar, dp.bio_en,
        dp.consultation_fee, dp.is_accepting_patients,
        p.latitude, p.longitude,
        json_agg(json_build_object(
          'id', cl.id, 'name', cl.name_en, 'address', cl.address,
          'governorate_id', cl.governorate_id, 'lat', cl.lat, 'lng', cl.lng,
          'is_primary', cl.is_primary
        )) FILTER (WHERE cl.id IS NOT NULL) AS clinics
       FROM doctor_profiles dp
       JOIN profiles p ON p.id = dp.profile_id
       LEFT JOIN clinic_locations cl ON cl.doctor_id = dp.id AND cl.is_active = TRUE
       WHERE dp.id = $1
       GROUP BY dp.id, p.id`,
      [doctorProfileId],
    );

    res.json({ message: "Profile updated", profile: updated.rows[0] });
  } catch (err) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch (_) { /* connection already dead */ }
    }
    console.error("Doctor profile update error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (client) client.release();
  }
}

export async function getProfile(req, res) {
  const userId = req.user.sub;

  try {
    const result = await pool.query(
      `SELECT
        dp.id, dp.license_number, dp.license_verified,
        dp.years_of_experience, dp.bio_ar, dp.bio_en,
        dp.consultation_fee, dp.is_accepting_patients, dp.created_at,
        p.latitude, p.longitude,
        json_agg(json_build_object(
          'id', cl.id, 'name', cl.name_en, 'address', cl.address,
          'governorate_id', cl.governorate_id, 'lat', cl.lat, 'lng', cl.lng,
          'is_primary', cl.is_primary
        )) FILTER (WHERE cl.id IS NOT NULL) AS clinics,
        json_agg(json_build_object(
          'id', s.id, 'name_ar', s.name_ar, 'name_en', s.name_en,
          'price', dsp.price
        )) FILTER (WHERE dsp.id IS NOT NULL) AS services,
        json_agg(json_build_object(
          'id', sp.id, 'name_ar', sp.name_ar, 'name_en', sp.name_en
        )) FILTER (WHERE ds.specialty_id IS NOT NULL) AS specialties
       FROM profiles p
       JOIN doctor_profiles dp ON dp.profile_id = p.id
       LEFT JOIN clinic_locations cl ON cl.doctor_id = dp.id AND cl.is_active = TRUE
       LEFT JOIN doctor_service_prices dsp ON dsp.doctor_id = dp.id AND dsp.is_available = TRUE
       LEFT JOIN services s ON s.id = dsp.service_id
       LEFT JOIN doctor_specialties ds ON ds.doctor_id = dp.id
       LEFT JOIN specialties sp ON sp.id = ds.specialty_id
       WHERE p.user_id = $1
       GROUP BY dp.id, p.id`,
      [userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Doctor profile not found" });
    }

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error("Get doctor profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
