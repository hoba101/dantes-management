import test from "node:test";
import assert from "node:assert/strict";
import { validateRegistration } from "../src/validators/auth.js";

function run(body) {
  const req = { body };
  let statusCode = 200;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };
  let calledNext = false;
  validateRegistration(req, res, () => {
    calledNext = true;
  });
  return { statusCode, payload, calledNext };
}

const valid = {
  email: "patient@example.com",
  phone: "+201000000000",
  password: "longenough",
  role: "patient",
  fullNameAr: "محمد علي",
  fullNameEn: "Mohamed Ali",
};

test("accepts a valid registration payload", () => {
  const result = run(valid);
  assert.equal(result.calledNext, true);
});

test("rejects an invalid email", () => {
  const result = run({ ...valid, email: "not-an-email" });
  assert.equal(result.statusCode, 400);
  assert.ok(result.payload.details.includes("Valid email is required"));
});

test("rejects a short password", () => {
  const result = run({ ...valid, password: "123" });
  assert.equal(result.statusCode, 400);
  assert.ok(result.payload.details.some((d) => d.includes("at least 8")));
});

test("rejects an unknown role", () => {
  const result = run({ ...valid, role: "admin" });
  assert.equal(result.statusCode, 400);
  assert.ok(result.payload.details.some((d) => d.includes("Role must be")));
});

test("rejects missing Arabic and English names", () => {
  const result = run({ ...valid, fullNameAr: "", fullNameEn: " " });
  assert.equal(result.statusCode, 400);
  assert.equal(result.payload.details.length, 2);
});
