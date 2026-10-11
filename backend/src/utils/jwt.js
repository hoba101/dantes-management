import jwt from "jsonwebtoken";

const SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return s;
};

export function signToken(payload) {
  return jwt.sign(payload, SECRET(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: process.env.JWT_ISSUER || "dental-platform",
  });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET(), {
    issuer: process.env.JWT_ISSUER || "dental-platform",
  });
}
