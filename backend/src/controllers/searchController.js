import pool from "../config/database.js";

function haversine(latIdx, lngIdx) {
  return `
    6371 * 2 * asin(
      sqrt(
        power(sin(radians((p.latitude - $${latIdx}) / 2)), 2) +
        cos(radians($${latIdx})) * cos(radians(p.latitude)) *
        power(sin(radians((p.longitude - $${lngIdx}) / 2)), 2)
      )
    )
  `;
}

export async function search(req, res) {
  let {
    role,
    governorateId,
    serviceId,
    priceMin,
    priceMax,
    query,
    lat,
    lng,
    radiusInKm,
    limit = 20,
    offset = 0,
  } = req.query;

  const allowedRoles = ["doctor", "student"];
  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({ error: "role must be 'doctor' or 'student'" });
  }

  if ((lat || lng) && !(lat && lng)) {
    return res.status(400).json({ error: "Both lat and lng are required together" });
  }

  const useGeo = lat && lng && radiusInKm;

  if (useGeo) {
    lat = Number(lat);
    lng = Number(lng);
    radiusInKm = Number(radiusInKm);
    if (isNaN(lat) || isNaN(lng) || isNaN(radiusInKm)) {
      return res.status(400).json({ error: "lat, lng, and radiusInKm must be valid numbers" });
    }
  }

  limit = Number(limit);
  offset = Number(offset);
  const targetRoles = role ? [role] : allowedRoles;

  try {
    const whereClauses = [];
    const whereParams = [];

    if (targetRoles.length === 2) {
      whereClauses.push(`u.role IN ($${whereParams.length + 1}, $${whereParams.length + 2})`);
      whereParams.push("doctor", "student");
    } else {
      whereClauses.push(`u.role = $${whereParams.length + 1}`);
      whereParams.push(targetRoles[0]);
    }

    whereClauses.push("u.is_active = TRUE");

    if (query && query.trim().length > 0) {
      const q = `%${query.trim()}%`;
      whereClauses.push(
        `(p.full_name_en ILIKE $${whereParams.length + 1} OR p.full_name_ar ILIKE $${whereParams.length + 1}
         OR dp.bio_en ILIKE $${whereParams.length + 1} OR sp.bio_en ILIKE $${whereParams.length + 1})`,
      );
      whereParams.push(q);
    }

    if (governorateId) {
      whereClauses.push(
        `EXISTS (SELECT 1 FROM clinic_locations cl2
         WHERE cl2.doctor_id = dp.id AND cl2.governorate_id = $${whereParams.length + 1}
         AND cl2.is_active = TRUE)`,
      );
      whereParams.push(governorateId);
    }

    if (role === "doctor" && serviceId) {
      whereClauses.push(
        `EXISTS (SELECT 1 FROM doctor_service_prices dsp2
         WHERE dsp2.doctor_id = dp.id AND dsp2.service_id = $${whereParams.length + 1}
         AND dsp2.is_available = TRUE)`,
      );
      whereParams.push(serviceId);
    }

    if (role === "doctor" && priceMin !== undefined) {
      whereClauses.push(
        `EXISTS (SELECT 1 FROM doctor_service_prices dsp3
         WHERE dsp3.doctor_id = dp.id AND dsp3.price >= $${whereParams.length + 1}
         AND dsp3.is_available = TRUE)`,
      );
      whereParams.push(Number(priceMin));
    }

    if (role === "doctor" && priceMax !== undefined) {
      whereClauses.push(
        `EXISTS (SELECT 1 FROM doctor_service_prices dsp4
         WHERE dsp4.doctor_id = dp.id AND dsp4.price <= $${whereParams.length + 1}
         AND dsp4.is_available = TRUE)`,
      );
      whereParams.push(Number(priceMax));
    }

    if (role === "student" && serviceId) {
      whereClauses.push(
        `EXISTS (SELECT 1 FROM student_service_offerings sso2
         WHERE sso2.student_id = sp.id AND sso2.service_id = $${whereParams.length + 1}
         AND sso2.is_available = TRUE)`,
      );
      whereParams.push(serviceId);
    }

    if (role === "student" && priceMin !== undefined) {
      whereClauses.push(
        `EXISTS (SELECT 1 FROM student_service_offerings sso3
         WHERE sso3.student_id = sp.id AND sso3.materials_fee >= $${whereParams.length + 1}
         AND sso3.is_available = TRUE)`,
      );
      whereParams.push(Number(priceMin));
    }

    if (role === "student" && priceMax !== undefined) {
      whereClauses.push(
        `EXISTS (SELECT 1 FROM student_service_offerings sso4
         WHERE sso4.student_id = sp.id AND sso4.materials_fee <= $${whereParams.length + 1}
         AND sso4.is_available = TRUE)`,
      );
      whereParams.push(Number(priceMax));
    }

    const whereSQL = "WHERE " + whereClauses.join(" AND ");

    const geoOffset = useGeo ? 3 : 0;
    const paginationOffset = geoOffset;
    const latIdx = whereParams.length + 1;
    const lngIdx = whereParams.length + 2;
    const radiusIdx = whereParams.length + 3;

    const innerSelect = `
      SELECT
        u.id AS user_id, u.role,
        p.full_name_ar, p.full_name_en, p.avatar_url, p.gender,
        p.latitude, p.longitude,
        ${useGeo ? haversine(latIdx, lngIdx) + " AS distance_km" : "NULL::double precision AS distance_km"},
        dp.id AS doctor_profile_id,
        dp.consultation_fee, dp.is_accepting_patients,
        dp.years_of_experience,
        json_agg(DISTINCT jsonb_build_object(
          'id', cl.id, 'name', cl.name_en, 'address', cl.address,
          'governorate_id', cl.governorate_id,
          'lat', cl.lat, 'lng', cl.lng
        )) FILTER (WHERE cl.id IS NOT NULL) AS clinics,
        json_agg(DISTINCT jsonb_build_object(
          'id', s.id, 'name_ar', s.name_ar, 'name_en', s.name_en,
          'category', s.category, 'price', dsp.price
        )) FILTER (WHERE dsp.id IS NOT NULL) AS services,
        sp.id AS student_profile_id,
        sp.university, sp.academic_year,
        json_agg(DISTINCT jsonb_build_object(
          'id', srv.id, 'name_ar', srv.name_ar, 'name_en', srv.name_en,
          'category', srv.category, 'materials_fee', sso.materials_fee
        )) FILTER (WHERE sso.id IS NOT NULL) AS student_services
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      LEFT JOIN doctor_profiles dp ON dp.profile_id = p.id
      LEFT JOIN clinic_locations cl ON cl.doctor_id = dp.id AND cl.is_active = TRUE
      LEFT JOIN doctor_service_prices dsp ON dsp.doctor_id = dp.id AND dsp.is_available = TRUE
      LEFT JOIN services s ON s.id = dsp.service_id
      LEFT JOIN student_profiles sp ON sp.profile_id = p.id
      LEFT JOIN student_service_offerings sso ON sso.student_id = sp.id AND sso.is_available = TRUE
      LEFT JOIN services srv ON srv.id = sso.service_id
      ${whereSQL}
      GROUP BY u.id, p.id, dp.id, sp.id
    `;

    const effectiveLimit = limit;
    const effectiveOffset = offset;
    const limitParamIdx = latIdx + geoOffset;
    const offsetParamIdx = latIdx + geoOffset + 1;

    const outerSQL = `
      SELECT * FROM (${innerSelect}) sub
      ${useGeo ? `WHERE distance_km IS NULL OR distance_km <= $${radiusIdx}` : ""}
      ORDER BY
        ${useGeo ? "distance_km NULLS LAST," : ""}
        CASE WHEN sub.role = 'doctor' THEN sub.consultation_fee END NULLS LAST,
        sub.full_name_en
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `;

    const queryParams = useGeo
      ? [...whereParams, lat, lng, radiusInKm, effectiveLimit, effectiveOffset]
      : [...whereParams, effectiveLimit, effectiveOffset];

    const result = await pool.query(outerSQL, queryParams);

    if (useGeo) {
      const countSQL = `
        SELECT COUNT(*) AS total FROM (
          SELECT u.id
          FROM users u
          JOIN profiles p ON p.user_id = u.id
          LEFT JOIN doctor_profiles dp ON dp.profile_id = p.id
          LEFT JOIN student_profiles sp ON sp.profile_id = p.id
          ${whereSQL}
          GROUP BY u.id, p.id, dp.id, sp.id
          HAVING (${haversine(latIdx, lngIdx)} IS NULL OR ${haversine(latIdx, lngIdx)} <= $${radiusIdx})
        ) sub
      `;
      const countResult = await pool.query(countSQL, [...whereParams, lat, lng, radiusInKm]);
      return res.json({
        results: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0]?.total || "0", 10),
          limit: effectiveLimit,
          offset: effectiveOffset,
        },
      });
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM (SELECT u.id FROM users u ${whereSQL} GROUP BY u.id) sub`,
      whereParams,
    );

    res.json({
      results: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0]?.total || "0", 10),
        limit: effectiveLimit,
        offset: effectiveOffset,
      },
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
