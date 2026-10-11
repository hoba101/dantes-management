const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;
const ROLES = new Set(["student", "doctor", "patient"]);
const GENDER = new Set(["male", "female"]);

export function validateRegistration(req, res, next) {
  const errors = [];

  const { email, phone, password, role, fullNameAr, fullNameEn } = req.body;

  if (!email || !EMAIL_RE.test(email)) errors.push("Valid email is required");
  if (!phone || !PHONE_RE.test(phone))
    errors.push("Valid phone number is required (7-15 digits, optional +)");
  if (!password || password.length < 8)
    errors.push("Password must be at least 8 characters");
  if (!role || !ROLES.has(role)) errors.push("Role must be student, doctor, or patient");
  if (!fullNameAr || fullNameAr.trim().length < 2)
    errors.push("Arabic full name is required (min 2 chars)");
  if (!fullNameEn || fullNameEn.trim().length < 2)
    errors.push("English full name is required (min 2 chars)");

  if (req.body.gender && !GENDER.has(req.body.gender))
    errors.push("Gender must be male or female");

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  next();
}
