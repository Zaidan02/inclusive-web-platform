import assert from "node:assert/strict";
import { API_BASE, fixtureAccounts, login, requestJson, tokenHeaders } from "./test-helpers.mjs";

const stamp = Date.now();
const email = `resend-verification-${stamp}@example.test`;
const username = `resend_verification_${stamp}`;
let userId = null;
const adminToken = await login(fixtureAccounts.admin.email);

try {
  const registration = await requestJson(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email,
      password: "Synthetic9!Test",
      accountType: "employer",
      privacyAccepted: true,
      privacyVersion: "2026-08-03",
      sendVerificationEmail: false,
    }),
  });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.body.emailSent, false);

  const first = await requestJson(`${API_BASE}/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  assert.equal(first.response.status, 200);
  assert.equal(first.body.retryAfterSeconds, 60);

  const second = await requestJson(`${API_BASE}/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  assert.equal(second.response.status, 429);
  assert.ok(Number(second.body.retryAfterSeconds) > 0);
  assert.ok(Number(second.response.headers.get("retry-after")) > 0);

  const unknown = await requestJson(`${API_BASE}/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `unknown-${stamp}@example.test` }),
  });
  assert.equal(unknown.response.status, 200);
  assert.equal(unknown.body.message, first.body.message);

  const invalid = await requestJson(`${API_BASE}/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid" }),
  });
  assert.equal(invalid.response.status, 400);

  const users = await requestJson(`${API_BASE}/admin/users`, { headers: tokenHeaders(adminToken) });
  userId = (users.body.users || []).find((item) => item.email === email)?.id || null;
  assert.ok(userId);
  process.stdout.write("PASS resend verification delivery, cooldown, anti-enumeration and validation checks.\n");
} finally {
  if (userId) {
    const removed = await requestJson(`${API_BASE}/admin/users/${userId}`, {
      method: "DELETE",
      headers: tokenHeaders(adminToken),
    });
    assert.equal(removed.response.status, 200);
  }
}
