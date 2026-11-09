// Creates demo accounts, services and prices so the app is usable right away.
// Usage: npm run db:seed  (after migrations)
import "dotenv/config";
import pg from "pg";
import bcrypt from "bcrypt";

const PASSWORD = "Demo1234!";
const DEMO = [
  {
    email: "doctor@demo.dantes.local",
    role: "doctor",
    phone: "+201000000001",
    nameAr: "د. أحمد سالم",
    nameEn: "Dr. Ahmed Salem",
    gender: "male",
  },
  {
    email: "student@demo.dantes.local",
    role: "student",
    phone: "+201000000002",
    nameAr: "سارة محمود",
    nameEn: "Sara Mahmoud",
    gender: "female",
  },
  {
    email: "patient@demo.dantes.local",
    role: "patient",
    phone: "+201000000003",
    nameAr: "محمد علي",
    nameEn: "Mohamed Ali",
    gender: "male",
  },
];

const SERVICES = [
  ["تنظيف الأسنان", "Dental Cleaning", "Preventive", 30, false, 400],
  ["حشو الأسنان", "Dental Filling", "Restorative", 45, false, 700],
  ["خلع ضرس العقل", "Wisdom Tooth Extraction", "Surgery", 60, true, 2500],
  ["تبييض الأسنان", "Teeth Whitening", "Cosmetic", 60, false, 3000],
  ["علاج العصب", "Root Canal Treatment", "Endodontics", 90, true, 3500],
];

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

try {
  await client.connect();
} catch (err) {
  console.error("Could not connect to PostgreSQL:", err.message);
  process.exit(1);
}

const passwordHash = await bcrypt.hash(PASSWORD, 10);

await client.query("BEGIN");
try {
  for (const service of SERVICES) {
    const [nameAr, nameEn, category, duration, supervision] = service;
    await client.query(
      `INSERT INTO services (name_ar, name_en, category, estimated_duration_mins, requires_supervision)
       SELECT $1::text, $2::text, $3::text, $4::smallint, $5::boolean
       WHERE NOT EXISTS (SELECT 1 FROM services WHERE name_en = $2::text)`,
      [nameAr, nameEn, category, duration, supervision],
    );
  }

  for (const user of DEMO) {
    const { rows } = await client.query(
      `INSERT INTO users (email, phone, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [user.email, user.phone, passwordHash, user.role],
    );

    const userId =
      rows[0]?.id ||
      (await client.query("SELECT id FROM users WHERE email = $1", [user.email]))
        .rows[0].id;

    const profile = await client.query(
      `INSERT INTO profiles (user_id, full_name_ar, full_name_en, gender)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING id`,
      [userId, user.nameAr, user.nameEn, user.gender],
    );

    const profileId =
      profile.rows[0]?.id ||
      (
        await client.query("SELECT id FROM profiles WHERE user_id = $1", [
          userId,
        ])
      ).rows[0].id;

    if (user.role === "doctor") {
      const doctor = await client.query(
        `INSERT INTO doctor_profiles
           (profile_id, license_number, license_verified, years_of_experience,
            bio_en, bio_ar, consultation_fee, is_accepting_patients)
         VALUES ($1, 'DEMO-DR-001', TRUE, 8,
                 'Demo dentist with a focus on restorative and cosmetic care.',
                 'طبيب أسنان تجريبي متخصص في العلاج الترميمي والتجميلي.',
                 250, TRUE)
         ON CONFLICT (profile_id) DO NOTHING
         RETURNING id`,
        [profileId],
      );
      const doctorId =
        doctor.rows[0]?.id ||
        (
          await client.query(
            "SELECT id FROM doctor_profiles WHERE profile_id = $1",
            [profileId],
          )
        ).rows[0].id;

      for (const [nameAr, nameEn, , , , price] of SERVICES) {
        const service = await client.query(
          "SELECT id FROM services WHERE name_en = $1",
          [nameEn],
        );
        if (!service.rows[0]) continue;
        await client.query(
          `INSERT INTO doctor_service_prices (doctor_id, service_id, price)
           SELECT $1, $2, $3
           WHERE NOT EXISTS (
             SELECT 1 FROM doctor_service_prices
             WHERE doctor_id = $1 AND service_id = $2
           )`,
          [doctorId, service.rows[0].id, price],
        );
      }
    }

    if (user.role === "student") {
      await client.query(
        `INSERT INTO student_profiles
           (profile_id, university, faculty, academic_year, student_id_number,
            bio_en, bio_ar, is_available)
         VALUES ($1, 'Cairo University', 'Faculty of Dentistry', 4, '2024-DENT-015',
                 'Final-year dental student offering free supervised appointments.',
                 'طالبة أسنان في السنة النهائية تقدم مواعيد مجانية تحت الإشراف.',
                 TRUE)
         ON CONFLICT (profile_id) DO NOTHING`,
        [profileId],
      );
    }

    if (user.role === "patient") {
      await client.query(
        `INSERT INTO patient_profiles
           (profile_id, emergency_contact_name, emergency_contact_phone)
         VALUES ($1, 'Family contact', '+201000000099')
         ON CONFLICT (profile_id) DO NOTHING`,
        [profileId],
      );
    }
  }

  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Seed failed:", err.message);
  await client.end();
  process.exit(1);
}

await client.end();
console.log("Seeded demo data.\n");
console.log("Demo accounts (password: %s)", PASSWORD);
for (const user of DEMO) console.log(`  ${user.role.padEnd(8)} ${user.email}`);
