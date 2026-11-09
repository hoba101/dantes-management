import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-that-is-longer-than-32-characters";
process.env.JWT_ISSUER = "dental-platform";

const { signToken, verifyToken } = await import("../src/utils/jwt.js");

test("signs and verifies a token", () => {
  const token = signToken({ sub: "user-1", role: "doctor" });
  const payload = verifyToken(token);
  assert.equal(payload.sub, "user-1");
  assert.equal(payload.role, "doctor");
  assert.equal(payload.iss, "dental-platform");
});

test("rejects a tampered token", () => {
  const token = signToken({ sub: "user-1" });
  assert.throws(() => verifyToken(`${token}x`), /invalid signature/i);
});

test("rejects a token from a different issuer", async () => {
  const jwt = (await import("jsonwebtoken")).default;
  const foreign = jwt.sign({ sub: "x" }, process.env.JWT_SECRET, {
    issuer: "some-other-service",
  });
  assert.throws(() => verifyToken(foreign), /jwt issuer invalid/i);
});
