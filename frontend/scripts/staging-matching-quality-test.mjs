import assert from "node:assert/strict";
import path from "node:path";
import {
  API_BASE,
  fixtureAccounts,
  login,
  requestJson,
  tokenHeaders,
  writeJsonReport,
} from "./test-helpers.mjs";

const OUTPUT = process.env.MATCHING_OUTPUT
  || path.resolve("..", "docs", "testing", "staging-2026-09-10", "matching-quality-results.json");
const SCORING_HEALTH = process.env.TEST_SCORING_HEALTH
  || "https://join-hospitality-zm-scoring-staging.onrender.com/health";
const ROLE_INDEX = Number(process.env.MATCHING_ROLE_INDEX || 0);
const ARCHETYPE_INDEX = Number(process.env.MATCHING_ARCHETYPE_INDEX || 0);
const TOLERANCE = 0.03;

const archetypes = [
  {
    name: "Independent",
    profile: {
      educationLevel: "university",
      readingAbility: "independent",
      writingAbility: "independent",
      numeracyAbility: "independent",
      knowledgeLevel: "independent",
    },
  },
  {
    name: "With support",
    profile: {
      educationLevel: "high_school",
      readingAbility: "with_support",
      writingAbility: "with_support",
      numeracyAbility: "with_support",
      knowledgeLevel: "with_support",
    },
  },
  {
    name: "Eligibility gates",
    profile: {
      educationLevel: "none",
      readingAbility: "not_yet",
      writingAbility: "not_yet",
      numeracyAbility: "not_yet",
      knowledgeLevel: "not_yet",
    },
  },
];

function closeTo(actual, expected, label) {
  assert.ok(Number.isFinite(actual), `${label}: actual value is not finite`);
  assert.ok(Math.abs(actual - expected) <= TOLERANCE, `${label}: expected ${expected}, received ${actual}`);
}

function validateResult(result, archetype) {
  assert.ok(Array.isArray(result.task_results) && result.task_results.length > 0, "task results are required");
  assert.ok(Array.isArray(result.ability_results), "ability results must be an array");
  assert.ok(Array.isArray(result.exclusion_reasons), "exclusion reasons must be an array");

  let earned = 0;
  let maximum = 0;
  for (const task of result.task_results) {
    assert.ok([0, 0.75, 1].includes(task.feasibility_factor), "unexpected task feasibility factor");
    closeTo(task.earned_points, task.adjusted_weight * task.feasibility_factor, "task earned points");
    earned += task.earned_points;
    maximum += task.adjusted_weight;
    assert.ok(String(task.explanation || "").trim(), "task explanation is required");
  }
  closeTo(result.earned_points, earned, "total earned points");
  closeTo(result.maximum_points, maximum, "total maximum points");
  closeTo(result.task_score, (earned / maximum) * 100, "task percentage");

  for (const ability of result.ability_results) {
    assert.ok(String(ability.explanation || "").trim(), "ability explanation is required");
    if (archetype.name === "Independent") {
      assert.equal(ability.factor, 1);
      assert.equal(ability.meets_requirement, true);
    }
    if (archetype.name === "With support") {
      assert.equal(ability.factor, ability.assistance_available ? 0.75 : 0.25);
      assert.equal(ability.meets_requirement, ability.assistance_available);
    }
    if (archetype.name === "Eligibility gates") {
      assert.equal(ability.factor, 0);
      assert.equal(ability.meets_requirement, false);
    }
  }

  const practicalShare = result.practical_ability_score === null ? 0 : 0.25;
  const educationShare = result.education_score === null ? 0 : 0.10;
  const taskShare = 1 - practicalShare - educationShare;
  const expectedScore = result.task_score * taskShare
    + (result.practical_ability_score || 0) * practicalShare
    + (result.education_score || 0) * educationShare;

  if (result.eligible) {
    assert.equal(result.exclusion_reasons.length, 0);
    closeTo(result.score, expectedScore, "combined compatibility percentage");
    assert.match(result.summary, /eligible/i);
    assert.match(result.summary, new RegExp(Number(result.score).toFixed(2).replace(".", "\\.")));
  } else {
    assert.equal(result.score, null);
    assert.ok(result.exclusion_reasons.length > 0, "ineligible result must explain its gate");
    assert.match(result.summary, /not eligible/i);
  }
}

function stableResults(results) {
  return [...results]
    .sort((left, right) => Number(left.job_id) - Number(right.job_id))
    .map((result) => ({
      jobId: Number(result.job_id),
      eligible: result.eligible,
      score: result.score,
      taskScore: result.task_score,
      practicalAbilityScore: result.practical_ability_score,
      educationScore: result.education_score,
      exclusionReasons: result.exclusion_reasons,
    }));
}

function summarize(items) {
  const summary = {
    passed: items.filter((item) => item.status === "passed").length,
    failed: items.filter((item) => item.status === "failed").length,
    blocked: items.filter((item) => item.status === "blocked").length,
    executed: items.filter((item) => ["passed", "failed"].includes(item.status)).length,
    total: items.length,
  };
  summary.successRate = summary.executed
    ? Math.round((summary.passed / summary.executed) * 10000) / 100
    : null;
  return summary;
}

async function writeCheckpoint(items, complete = false) {
  return writeJsonReport(OUTPUT, {
    generatedAt: new Date().toISOString(),
    complete,
    environment: { apiBase: API_BASE, scoringHealth: SCORING_HEALTH },
    method: "Fifteen catalogue roles by three controlled synthetic candidate archetypes. Each result is independently recalculated and requested twice.",
    summary: summarize(items),
    cases: items,
  });
}

const apiHealth = await requestJson(`${API_BASE.replace(/\/api$/, "")}/health`);
assert.equal(apiHealth.response.status, 200, "Symfony API must be healthy before evaluation");
const scoringHealth = await requestJson(SCORING_HEALTH);
assert.equal(scoringHealth.response.status, 200, "Scoring service must be healthy before evaluation");

const token = await login(fixtureAccounts.candidate.email);
const definitionsResponse = await requestJson(`${API_BASE}/job-definitions`);
assert.equal(definitionsResponse.response.status, 200);
const definitions = definitionsResponse.body.jobs || [];
assert.equal(definitions.length, 15, "the controlled 15-role catalogue is required");
assert.ok(Number.isInteger(ROLE_INDEX) && ROLE_INDEX >= 0 && ROLE_INDEX <= definitions.length, "invalid MATCHING_ROLE_INDEX");
assert.ok(Number.isInteger(ARCHETYPE_INDEX) && ARCHETYPE_INDEX >= 0 && ARCHETYPE_INDEX <= archetypes.length, "invalid MATCHING_ARCHETYPE_INDEX");
const selectedDefinitions = ROLE_INDEX ? [definitions[ROLE_INDEX - 1]] : definitions;
const selectedArchetypes = ARCHETYPE_INDEX ? [archetypes[ARCHETYPE_INDEX - 1]] : archetypes;

const cases = [];
try {
  for (const definition of selectedDefinitions) {
    for (const archetype of selectedArchetypes) {
      const started = performance.now();
      const profilePayload = {
        selectedDisabilities: ["Hand"],
        educationLevel: archetype.profile.educationLevel,
        readingAbility: archetype.profile.readingAbility,
        writingAbility: archetype.profile.writingAbility,
        numeracyAbility: archetype.profile.numeracyAbility,
        firstName: "Quality",
        lastName: "Tester",
        phone: "",
        location: "Staging",
        about: "Synthetic matching-quality profile.",
        opportunityPreference: "both",
        positionInterests: [{
          jobDefinitionId: definition.id,
          knowledgeLevel: archetype.profile.knowledgeLevel,
        }],
      };

      const saved = await requestJson(`${API_BASE}/candidate/profile`, {
        method: "PATCH",
        headers: { ...tokenHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload),
      });
      if (saved.response.status !== 200) {
        cases.push({
          testId: `ME-${String(definition.id).padStart(2, "0")}-${archetypes.indexOf(archetype) + 1}`,
          role: definition.name,
          archetype: archetype.name,
          status: "blocked",
          reason: `Profile precondition rejected with HTTP ${saved.response.status}: ${saved.body.message || "unknown"}`,
        });
        continue;
      }

      const first = await requestJson(`${API_BASE}/candidate/matches`, { headers: tokenHeaders(token) });
      const second = await requestJson(`${API_BASE}/candidate/matches`, { headers: tokenHeaders(token) });
      try {
        assert.equal(first.response.status, 200);
        assert.equal(second.response.status, 200);
        assert.ok(Array.isArray(first.body.results) && first.body.results.length > 0, "published offers are required");
        assert.deepEqual(stableResults(second.body.results), stableResults(first.body.results), "repeated output must be deterministic");
        for (const result of first.body.results) validateResult(result, archetype);

        const gateCount = first.body.results.filter((result) => !result.eligible).length;
        const configuredAbilityCount = first.body.results.filter((result) => result.ability_results.length > 0).length;
        let status = "passed";
        let note = "Formula, components, explanations and repeated outputs are consistent.";
        if (archetype.name === "With support" && configuredAbilityCount === 0) {
          status = "blocked";
          note = "No published offer for this role configures a practical-ability requirement.";
        }
        if (archetype.name === "Eligibility gates" && gateCount === 0) {
          status = "blocked";
          note = "No published offer for this role activates a required eligibility gate.";
        }
        cases.push({
          testId: `ME-${String(definition.id).padStart(2, "0")}-${archetypes.indexOf(archetype) + 1}`,
          role: definition.name,
          archetype: archetype.name,
          status,
          durationMs: Math.round((performance.now() - started) * 10) / 10,
          offerCount: first.body.results.length,
          eligibleCount: first.body.results.length - gateCount,
          ineligibleCount: gateCount,
          configuredAbilityCount,
          note,
        });
      } catch (error) {
        cases.push({
          testId: `ME-${String(definition.id).padStart(2, "0")}-${archetypes.indexOf(archetype) + 1}`,
          role: definition.name,
          archetype: archetype.name,
          status: "failed",
          durationMs: Math.round((performance.now() - started) * 10) / 10,
          reason: String(error.message || error),
          firstHttpStatus: first.response.status,
          secondHttpStatus: second.response.status,
        });
      }
      process.stdout.write(`${cases.at(-1).status.toUpperCase()} ${definition.name} / ${archetype.name}\n`);
      await writeCheckpoint(cases, false);
      const cleanup = await requestJson(`${API_BASE}/candidate/profile/reset`, {
        method: "POST",
        headers: tokenHeaders(token),
      });
      assert.equal(cleanup.response.status, 200, "synthetic candidate profile checkpoint cleanup failed");
    }
  }
} finally {
  const reset = await requestJson(`${API_BASE}/candidate/profile/reset`, {
    method: "POST",
    headers: tokenHeaders(token),
  });
  assert.equal(reset.response.status, 200, "synthetic candidate profile cleanup failed");
}

const summary = summarize(cases);
const reportPath = await writeCheckpoint(cases, true);
process.stdout.write(`Matching quality summary: ${JSON.stringify(summary)}\n`);
process.stdout.write(`Report: ${reportPath}\n`);
if (summary.failed > 0) process.exitCode = 1;
