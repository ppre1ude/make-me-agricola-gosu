import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DraftFixture, DraftFixtureExpected } from "../src/features/draft/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(rootDir, "data/fixtures/draft");
const minimumDomainFixtureCount = 15;

type CoverageLevel = "direct" | "shared" | "partial" | "missing";

type GateCase = {
  id: string;
  coverage: CoverageLevel;
  fixtureIds: string[];
  evidence: string[];
  reviewNote?: string;
};

type Gate = {
  name: string;
  target: string;
  cases: GateCase[];
};

const schemaGate: Gate = {
  name: "Schema Stabilization Gate",
  target: "DraftRecommendation output contract can be rendered by future UI code.",
  cases: [
    {
      id: "happy-path-recommendation",
      coverage: "direct",
      fixtureIds: ["early-anchor"],
      evidence: ["topCardId and returnLikelihood assertions"]
    },
    {
      id: "multi-group-recommendation",
      coverage: "direct",
      fixtureIds: ["early-anchor"],
      evidence: ["broken_candidate and plan_anchor_candidate assertions"]
    },
    {
      id: "general-or-fallback-recommendation",
      coverage: "partial",
      fixtureIds: ["missing-profile-warning-and-evaluation-meta"],
      evidence: ["missing-profile card remains evaluable with metadata"],
      reviewNote: "No explicit general_value_candidate or fallback_filler_candidate assertion yet."
    },
    {
      id: "missing-profile-warning-and-evaluation-meta",
      coverage: "direct",
      fixtureIds: ["missing-profile-warning-and-evaluation-meta"],
      evidence: ["warningIncludes and evaluationMetaIncludes assertions"]
    },
    {
      id: "return-likelihood-shape",
      coverage: "direct",
      fixtureIds: ["return-likelihood-shape"],
      evidence: ["unlikely and likely returnLikelihood assertions"]
    },
    {
      id: "next-pick-direction-shape",
      coverage: "direct",
      fixtureIds: ["next-pick-direction-shape"],
      evidence: ["nextPickIncludes assertions"]
    },
    {
      id: "warnings-and-evaluation-meta-do-not-pollute-reasons",
      coverage: "partial",
      fixtureIds: ["missing-profile-warning-and-evaluation-meta"],
      evidence: ["warnings and evaluationMeta are asserted separately"],
      reviewNote: "There is no negative reasonExcludes assertion or runtime check yet."
    }
  ]
};

const domainGate: Gate = {
  name: "Domain Logic / Product Readiness Gate",
  target: "Accepted strategic judgment is pinned before product-ready UI work.",
  cases: [
    {
      id: "early-broken-beats-medium-synergy",
      coverage: "direct",
      fixtureIds: ["early-anchor"],
      evidence: ["broken rank 1 beats medium support alternatives"]
    },
    {
      id: "early-plan-anchor-beats-late-points",
      coverage: "direct",
      fixtureIds: ["early-anchor"],
      evidence: ["plan_anchor_candidate rank 1 beats late points"]
    },
    {
      id: "solved-role-downranks-high-stat-duplicate",
      coverage: "direct",
      fixtureIds: ["solved-role-downranks-high-stat-duplicate"],
      evidence: ["downrankedBelow, saturationPenalty, and role_saturation risk"]
    },
    {
      id: "field-watchman-saturation",
      coverage: "direct",
      fixtureIds: ["field-watchman-saturation"],
      evidence: ["Field Watchman hand downranks another field card"]
    },
    {
      id: "field-watchman-needs-bake-or-food-followup",
      coverage: "shared",
      fixtureIds: ["late-completion", "next-pick-direction-shape"],
      evidence: ["late food/bake top card and next-pick guidance"],
      reviewNote: "Covered through two fixtures rather than one direct Field Watchman follow-up case."
    },
    {
      id: "low-adp-card-unlikely-to-return",
      coverage: "direct",
      fixtureIds: ["return-likelihood-shape"],
      evidence: ["Field Watchman is asserted unlikely to return"]
    },
    {
      id: "high-adp-card-likely-to-return",
      coverage: "direct",
      fixtureIds: ["return-likelihood-shape"],
      evidence: ["Late Points is asserted likely to return"]
    },
    {
      id: "conditional-card-emits-risk-penalty",
      coverage: "direct",
      fixtureIds: ["conditional-card-emits-risk-penalty"],
      evidence: ["riskPenalty, risky candidate group, and hasRisk assertions"]
    },
    {
      id: "missing-stat-ranks-with-unknown-return",
      coverage: "direct",
      fixtureIds: ["missing-stat-unknown-return"],
      evidence: ["unknown returnLikelihood and missing stat metadata"]
    },
    {
      id: "missing-profile-ranks-with-low-confidence",
      coverage: "direct",
      fixtureIds: ["missing-profile-warning-and-evaluation-meta"],
      evidence: ["low confidence and missing strategy_profile metadata"]
    },
    {
      id: "late-pick-prefers-hole-filling-over-raw-power",
      coverage: "direct",
      fixtureIds: ["late-completion"],
      evidence: ["late pick food/bake completion wins rank 1"]
    },
    {
      id: "conflict-card-downranked",
      coverage: "direct",
      fixtureIds: ["conflict-card-downranked"],
      evidence: ["conflictCost and downrankedBelow assertions"]
    },
    {
      id: "food-engine-and-food-support-are-distinct",
      coverage: "direct",
      fixtureIds: ["food-engine-and-food-support-distinct"],
      evidence: ["food engine beats support and both groups are asserted"]
    },
    {
      id: "next-pick-guidance-is-emitted",
      coverage: "direct",
      fixtureIds: ["next-pick-direction-shape"],
      evidence: ["nextPickIncludes assertions"]
    },
    {
      id: "full-tracking-missing-cards-raise-role-pressure-weakly",
      coverage: "direct",
      fixtureIds: ["full-tracking-role-pressure"],
      evidence: ["full_pack, previousPackCardIds, roleAvailabilityPressure, and tracking signal"]
    }
  ]
};

const stretchCases: GateCase[] = [
  {
    id: "broken-card-resists-but-does-not-ignore-saturation",
    coverage: "missing",
    fixtureIds: [],
    evidence: [],
    reviewNote: "Not yet represented by a dedicated stretch fixture."
  },
  {
    id: "middle-pick-high-pass-regret-beats-weak-support",
    coverage: "direct",
    fixtureIds: ["middle-pick-high-pass-regret-beats-weak-support"],
    evidence: ["passRegret component and high_pass_regret_candidate assertions"]
  },
  {
    id: "late-pick-candidate-set-before-tier",
    coverage: "direct",
    fixtureIds: ["late-pick-candidate-set-before-tier"],
    evidence: ["late support and food stability candidate groups win rank 1"]
  },
  {
    id: "high-pass-regret-plan-anchor-creates-pivot-hint",
    coverage: "partial",
    fixtureIds: ["plan-shift-hint-high-impact"],
    evidence: ["planShiftIncludes and plan_anchor_candidate assertions"],
    reviewNote: "Does not assert passRegret or pivotPotential for the same card yet."
  },
  {
    id: "model-user-disagreement-recorded-without-judgment",
    coverage: "missing",
    fixtureIds: [],
    evidence: [],
    reviewNote: "Deferred until feedback events exist."
  }
];

const fixtures = await readFixtures();
const fixtureIds = new Set(fixtures.map((fixture) => fixture.id));
const allGateCases = [...schemaGate.cases, ...domainGate.cases, ...stretchCases];
const missingReferencedFixtureIds = findMissingReferencedFixtureIds(allGateCases, fixtureIds);

printFixtureGateReport(fixtures);

if (missingReferencedFixtureIds.length > 0) {
  console.error("\nMissing fixture references:");
  for (const fixtureId of missingReferencedFixtureIds) console.error(`- ${fixtureId}`);
  process.exitCode = 1;
}

async function readFixtures(): Promise<DraftFixture[]> {
  const fixtureFiles = (await readdir(fixtureDir)).filter((file) => file.endsWith(".json")).sort();
  const fixtures: DraftFixture[] = [];

  for (const file of fixtureFiles) {
    fixtures.push(await readJson<DraftFixture>(path.join(fixtureDir, file)));
  }

  return fixtures.sort((a, b) => a.id.localeCompare(b.id));
}

async function readJson<T>(absolutePath: string): Promise<T> {
  return JSON.parse(await readFile(absolutePath, "utf8")) as T;
}

function printFixtureGateReport(fixtures: DraftFixture[]): void {
  console.log("# Draft Fixture Gate Report\n");
  console.log(`Fixture count: ${fixtures.length}`);
  console.log(`Domain fixture count target: ${minimumDomainFixtureCount}+`);
  console.log(`Domain fixture count status: ${fixtures.length >= minimumDomainFixtureCount ? "covered" : "missing"}\n`);

  printGate(schemaGate);
  printGate(domainGate);
  printStretchCases(stretchCases);
  printAssertionCoverage(fixtures);

  console.log("Human review status: pending");
  console.log("Review focus: strategy judgment quality, passRegret, risk penalty, late-pick tradeoffs.");
}

function printGate(gate: Gate): void {
  const summary = summarizeCoverage(gate.cases);

  console.log(`## ${gate.name}`);
  console.log(gate.target);
  console.log(
    `Coverage: ${summary.direct} direct, ${summary.shared} shared, ${summary.partial} partial, ${summary.missing} missing / ${gate.cases.length} total\n`
  );

  for (const gateCase of gate.cases) {
    printCase(gateCase);
  }

  console.log("");
}

function printStretchCases(gateCases: GateCase[]): void {
  const summary = summarizeCoverage(gateCases);

  console.log("## Stretch Cases");
  console.log(
    `Coverage: ${summary.direct} direct, ${summary.shared} shared, ${summary.partial} partial, ${summary.missing} missing / ${gateCases.length} total\n`
  );

  for (const gateCase of gateCases) {
    printCase(gateCase);
  }

  console.log("");
}

function printCase(gateCase: GateCase): void {
  const presentFixtureIds = gateCase.fixtureIds.filter((fixtureId) => fixtureIds.has(fixtureId));
  const fixturesText = presentFixtureIds.length > 0 ? presentFixtureIds.join(", ") : "none";
  const evidenceText = gateCase.evidence.length > 0 ? `; evidence: ${gateCase.evidence.join("; ")}` : "";
  const reviewText = gateCase.reviewNote === undefined ? "" : `; review: ${gateCase.reviewNote}`;

  console.log(`- [${gateCase.coverage}] ${gateCase.id}: ${fixturesText}${evidenceText}${reviewText}`);
}

function printAssertionCoverage(fixtures: DraftFixture[]): void {
  const supportedExpectedKeys: Array<keyof DraftFixtureExpected> = [
    "topCardId",
    "notTopCardIds",
    "downrankedBelow",
    "componentAtLeast",
    "componentBelow",
    "returnLikelihood",
    "hasRisk",
    "nextPickIncludes",
    "candidateGroupIncludes",
    "warningIncludes",
    "evaluationMetaIncludes",
    "trackingSignalIncludes",
    "planShiftIncludes",
    "reasonIncludes"
  ];
  const usedExpectedKeys = new Set(fixtures.flatMap((fixture) => Object.keys(fixture.expected ?? {})));
  const missingExpectedKeys = supportedExpectedKeys.filter((key) => !usedExpectedKeys.has(key));
  const fullPackFixtures = fixtures.filter((fixture) => fixture.input.trackingMode === "full_pack");
  const missingFromPreviousPackFixtures = fixtures.filter(
    (fixture) => fixture.input.missingFromPreviousPack !== undefined && fixture.input.missingFromPreviousPack.length > 0
  );

  console.log("## Assertion Coverage Notes");
  console.log(`Used expected keys: ${[...usedExpectedKeys].sort().join(", ") || "none"}`);
  console.log(`Unused expected keys: ${missingExpectedKeys.join(", ") || "none"}`);
  console.log(`full_pack fixtures: ${fullPackFixtures.map((fixture) => fixture.id).join(", ") || "none"}`);
  console.log(
    `missingFromPreviousPack fixtures: ${missingFromPreviousPackFixtures.map((fixture) => fixture.id).join(", ") || "none"}\n`
  );
}

function summarizeCoverage(gateCases: GateCase[]): Record<CoverageLevel, number> {
  return {
    direct: gateCases.filter((gateCase) => gateCase.coverage === "direct").length,
    shared: gateCases.filter((gateCase) => gateCase.coverage === "shared").length,
    partial: gateCases.filter((gateCase) => gateCase.coverage === "partial").length,
    missing: gateCases.filter((gateCase) => gateCase.coverage === "missing").length
  };
}

function findMissingReferencedFixtureIds(gateCases: GateCase[], fixtureIds: Set<string>): string[] {
  const missingFixtureIds = new Set<string>();

  for (const gateCase of gateCases) {
    for (const fixtureId of gateCase.fixtureIds) {
      if (!fixtureIds.has(fixtureId)) missingFixtureIds.add(fixtureId);
    }
  }

  return [...missingFixtureIds].sort();
}
