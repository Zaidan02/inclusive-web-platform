import { API_BASE, fixtureAccounts, login, requestJson, tokenHeaders } from "./test-helpers.mjs";

const action = process.argv[2] || "status";
const token = await login(fixtureAccounts.candidate.email);

if (action === "reset") {
  const { response, body } = await requestJson(`${API_BASE}/candidate/profile/reset`, {
    method: "POST",
    headers: tokenHeaders(token),
  });
  if (response.status !== 200) throw new Error(`Candidate reset failed: HTTP ${response.status}`);
  process.stdout.write(`${JSON.stringify({ action, status: response.status, profile: body.profile })}\n`);
} else if (action === "setup") {
  const definitions = await requestJson(`${API_BASE}/job-definitions`);
  const definition = definitions.body.jobs?.[0];
  if (definitions.response.status !== 200 || !definition?.id) throw new Error("No active job definition is available.");
  const payload = {
    selectedDisabilities: ["Hand"],
    educationLevel: "university",
    readingAbility: "independent",
    writingAbility: "independent",
    numeracyAbility: "independent",
    firstName: "Synthetic",
    lastName: "Candidate",
    phone: "",
    location: "Beirut",
    about: "Synthetic automated staging workflow test profile.",
    opportunityPreference: "both",
    positionInterests: [{ jobDefinitionId: definition.id, knowledgeLevel: "independent" }],
  };
  const { response, body } = await requestJson(`${API_BASE}/candidate/profile`, {
    method: "PATCH",
    headers: { ...tokenHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response.status !== 200) throw new Error(`Candidate setup failed: HTTP ${response.status} ${body.message || ""}`);
  process.stdout.write(`${JSON.stringify({ action, status: response.status, jobDefinitionId: definition.id })}\n`);
} else {
  const { response, body } = await requestJson(`${API_BASE}/candidate/profile`, { headers: tokenHeaders(token) });
  process.stdout.write(`${JSON.stringify({ action, status: response.status, profile: body.profile })}\n`);
}
