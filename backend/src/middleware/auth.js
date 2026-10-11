import { verifyToken } from "../utils/jwt.js";

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed token" });
  }

  try {
    const payload = verifyToken(header.split(" ")[1]);
    req.user = payload;
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token expired"
        : "Invalid token";
    return res.status(401).json({ error: message });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
