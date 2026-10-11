import pool from "../config/database.js";

export async function getProviderById(req, res) {
  const { id } = req.params;

  try {
    // Basic lookup to see if user exists and is a provider
    const userRes = await pool.query(
      `SELECT u.id, u.role, p.id as profile_id, p.full_name_ar, p.full_name_en, p.avatar_url, p.gender,
              dp.id as doctor_profile_id, dp.bio_ar, dp.bio_en, dp.years_of_experience, dp.consultation_fee,
              sp.id as student_profile_id, sp.university, sp.academic_year, sp.bio_ar as student_bio_ar, sp.bio_en as student_bio_en
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       LEFT JOIN doctor_profiles dp ON dp.profile_id = p.id
       LEFT JOIN student_profiles sp ON sp.profile_id = p.id
       WHERE u.id = $1 AND u.is_active = TRUE AND u.role IN ('doctor', 'student')`,
      [id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const provider = userRes.rows[0];
    const isDoctor = provider.role === "doctor";

    // Get Clinics
    const clinicsRes = isDoctor && provider.doctor_profile_id 
      ? await pool.query(
          "SELECT id, name_ar, name_en, address, lat, lng FROM clinic_locations WHERE doctor_id = $1 AND is_active = TRUE",
          [provider.doctor_profile_id]
        )
      : { rows: [] };

    // Get Services
    let services = [];
    if (isDoctor && provider.doctor_profile_id) {
      const srvRes = await pool.query(
        `SELECT s.id, s.name_ar, s.name_en, s.category, dsp.price 
         FROM doctor_service_prices dsp
         JOIN services s ON s.id = dsp.service_id
         WHERE dsp.doctor_id = $1 AND dsp.is_available = TRUE AND s.is_active = TRUE`,
        [provider.doctor_profile_id]
      );
      services = srvRes.rows;
    } else if (!isDoctor && provider.student_profile_id) {
      const srvRes = await pool.query(
        `SELECT s.id, s.name_ar, s.name_en, s.category, sso.materials_fee as price 
         FROM student_service_offerings sso
         JOIN services s ON s.id = sso.service_id
         WHERE sso.student_id = $1 AND sso.is_available = TRUE AND s.is_active = TRUE`,
        [provider.student_profile_id]
      );
      services = srvRes.rows;
    }

    // Get Portfolio Images
    const portfolioRes = await pool.query(
      "SELECT id, image_url, title, description FROM provider_portfolio WHERE profile_id = $1 ORDER BY created_at DESC",
      [provider.profile_id]
    );

    res.json({
      id: provider.id,
      role: provider.role,
      name_ar: provider.full_name_ar,
      name_en: provider.full_name_en,
      avatar_url: provider.avatar_url,
      gender: provider.gender,
      bio_ar: isDoctor ? provider.bio_ar : provider.student_bio_ar,
      bio_en: isDoctor ? provider.bio_en : provider.student_bio_en,
      years_of_experience: provider.years_of_experience,
      consultation_fee: provider.consultation_fee,
      university: provider.university,
      academic_year: provider.academic_year,
      clinics: clinicsRes.rows,
      services: services,
      portfolio: portfolioRes.rows,
    });
  } catch (err) {
    console.error("Get provider error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
