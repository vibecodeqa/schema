import { describe, expect, it } from "vitest";
import {
	CHECK_META,
	CATEGORY_WEIGHTS,
	RepoMetricHistoryResponseSchema,
	VibeReportSchema,
	getCategoryWeights,
	getCheckMeta,
	gradeFromScore,
	parseRepoMetricHistoryResponse,
	parseReport,
	safeParseRepoMetricHistoryResponse,
} from "../src/index.js";

const report = {
	version: "0.44.5",
	timestamp: "2026-07-23T00:00:00.000Z",
	score: 92,
	grade: "A",
	checks: [
		{
			name: "structure",
			score: 100,
			grade: "A",
			details: {},
			issues: [],
			duration: 1,
		},
	],
	meta: {
		cwd: "/tmp/project",
		node: "v24.0.0",
		duration: 5,
		stack: {
			language: "typescript",
			framework: "react",
			bundler: "vite",
			testRunner: "vitest",
			linter: "eslint",
			packageManager: "pnpm",
		},
		repoUrl: null,
		branch: "main",
	},
};

/** The canonical roster, spelled out rather than counted.
 *
 *  A bare `toHaveLength(n)` carries no provenance, and that cost us: schema#1
 *  (dead-code) and schema#5 (cloudflare-worker-mcp) were written concurrently
 *  and *both* changed 37 → 38, for different reasons. The assertions merged
 *  cleanly — same file, same line, same text — and the suite still claimed 38
 *  when the true merged value was 39. Two correct changes silently produced a
 *  wrong test.
 *
 *  Listing the names makes that impossible: a check added on one side and not
 *  the other shows up in the failure diff *by name*, and two independent
 *  additions conflict textually instead of agreeing on a stale integer. */
const CANONICAL_CHECKS = [
	"accessibility",
	"architecture",
	"best-practices",
	"cloudflare-worker-mcp",
	"cloudflare-workers",
	"code-coherence",
	"comment-staleness",
	"complexity",
	"confusion",
	"container-health",
	"context",
	"dead-code",
	"dead-patterns",
	"dependencies",
	"design-consistency",
	"doc-coherence",
	"docs",
	"duplication",
	"env-validation",
	"error-handling",
	"file-cohesion",
	"flutter",
	"frontend-health",
	"git-hygiene",
	"html-quality",
	"lint",
	"memory-safety",
	"performance",
	"react",
	"secrets",
	"security",
	"sqlite-d1",
	"standards",
	"structure",
	"styling",
	"test-audit",
	"testing",
	"type-safety",
	"types",
] as const;

describe("@vibecodeqa/schema", () => {
	it("exports exactly the canonical check roster", () => {
		// Sorted set equality: the failure names the check, not an integer.
		expect(Object.keys(CHECK_META).sort()).toEqual([...CANONICAL_CHECKS].sort());
	});

	it("exports canonical check metadata", () => {
		expect(CHECK_META.testing.weight).toBe(13);
		expect(CHECK_META["frontend-health"]).toBeDefined();
		expect(CHECK_META.flutter.appliesTo).toEqual({ framework: ["flutter"] });
		expect(CHECK_META["cloudflare-worker-mcp"]).toMatchObject({
			label: "Cloudflare Worker MCP",
			category: "Security",
			priority: "critical",
			weight: 0,
			appliesTo: { component: ["cloudflare-workers", "mcp-server"] },
		});
		expect(CHECK_META["cloudflare-worker-mcp"].description).not.toHaveLength(0);
		expect(CHECK_META["cloudflare-worker-mcp"].risk).not.toHaveLength(0);
		expect(CHECK_META["cloudflare-worker-mcp"].recommendation).not.toHaveLength(0);
	});

	/** Every entry must be complete. A half-added check whose recommendation is
	 *  "" is indistinguishable from an undocumented one at the explain surface:
	 *  `vcqa explain` treats an empty description as "Unknown check". */
	it("documents every check completely, with keys matching names", () => {
		for (const [key, meta] of Object.entries(CHECK_META)) {
			expect(meta.name, `${key}: name must match its key`).toBe(key);
			expect(meta.label.length, `${key}: label must be non-empty`).toBeGreaterThan(0);
			expect(meta.category.length, `${key}: category must be non-empty`).toBeGreaterThan(0);
			expect(meta.description.length, `${key}: description must be non-empty`).toBeGreaterThan(0);
			expect(meta.risk.length, `${key}: risk must be non-empty`).toBeGreaterThan(0);
			expect(meta.recommendation.length, `${key}: recommendation must be non-empty`).toBeGreaterThan(0);
		}
	});

	/** Regression for the dead-code gap: the check was emitted by the CLI but
	 *  documented by no schema version, so getCheckMeta silently fell back to a
	 *  category-"Other", weight-5 stub. That default is what makes the gap
	 *  invisible — it never throws, it just answers wrongly and, if the CLI ever
	 *  dropped its `synthetic` runtime guard, would take 5% of the composite. */
	it("documents dead-code as an unscored derived check, not the fallback stub", () => {
		const meta = getCheckMeta("dead-code");

		expect(meta).toBe(CHECK_META["dead-code"]);
		expect(meta.label).toBe("Dead Code");
		expect(meta.category).toBe("Architecture");
		// Weight 0 = advisory. Scoring it would double-count the same Knip
		// findings that `performance` (weight 4) already scores.
		expect(meta.weight).toBe(0);
		expect(meta.category).not.toBe("Other");
		expect(meta.deeperTools).toContain("knip");
	});

	it("falls back to a stub only for genuinely unknown checks", () => {
		const unknown = getCheckMeta("not-a-real-check");

		expect(unknown.category).toBe("Other");
		expect(unknown.weight).toBe(5);
		expect(unknown.description).toBe("");
	});

	it("exports category weight rollups", () => {
		expect(CATEGORY_WEIGHTS).toEqual(getCategoryWeights());
		expect(CATEGORY_WEIGHTS).toEqual({
			Foundations: 23,
			Quality: 30,
			Testing: 13,
			Security: 16,
			Architecture: 9,
			"LLM Readiness": 9,
			"AI Analysis": 0,
		});
		expect(Object.values(CATEGORY_WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBe(100);
	});

	it("validates full VibeReport JSON", () => {
		expect(parseReport(report)).toEqual(report);
		expect(VibeReportSchema.parse(report).grade).toBe("A");
	});

	it("keeps legacy reports without analyzer snapshots valid", () => {
		const parsed = parseReport(structuredClone(report));

		expect(parsed.meta.analyzerSnapshots).toBeUndefined();
	});

	it("validates modern reports with analyzer snapshots and metrics", () => {
		const modern = {
			...report,
			meta: {
				...report.meta,
				analyzerSnapshots: [
					{
						analyzerId: "react",
						status: "passed",
						score: 96,
						findingCount: 1,
						severityCounts: { warning: 1 },
						metrics: [
							{ id: "jsxFiles", label: "JSX/TSX files", value: 8, unit: "count", trend: "neutral" },
							{ id: "runtime", label: "Runtime", value: "react", trend: "neutral" },
							{ id: "hasCompiler", label: "Compiler enabled", value: true },
						],
						durationMs: 12,
					},
				],
			},
		};

		const parsed = parseReport(modern);

		expect(parsed.meta.analyzerSnapshots?.[0]?.analyzerId).toBe("react");
		expect(parsed.meta.analyzerSnapshots?.[0]?.metrics.map((metric) => metric.value)).toEqual([8, "react", true]);
	});

	it("rejects malformed analyzer metrics deliberately", () => {
		const withMetric = (metric: Record<string, unknown>) => ({
			...report,
			meta: {
				...report.meta,
				analyzerSnapshots: [
					{
						analyzerId: "react",
						status: "passed",
						findingCount: 0,
						severityCounts: {},
						metrics: [metric],
						durationMs: 1,
					},
				],
			},
		});

		expect(() => parseReport(withMetric({ id: "files", label: "Files", value: { count: 3 } }))).toThrow();
		expect(() => parseReport(withMetric({ id: "files", label: "Files", value: 3, unit: "lines" }))).toThrow();
		expect(() => parseReport(withMetric({ id: "files", label: "Files", value: 3, trend: "up-good" }))).toThrow();
	});

	it("allows future detector vocabularies", () => {
		const parsed = parseReport({
			...report,
			meta: {
				...report.meta,
				stack: {
					language: "rust",
					framework: "solid",
					bundler: "rolldown",
					testRunner: "uvu",
					linter: "oxlint",
					packageManager: "mise",
				},
				workspace: {
					isMonorepo: true,
					tool: "moonrepo",
					packages: [],
					srcRoots: [],
				},
			},
		});

		expect(parsed.meta.stack.language).toBe("rust");
		expect(parsed.meta.workspace?.tool).toBe("moonrepo");
	});

	it("preserves future report fields while validating required shape", () => {
		const parsed = parseReport({
			...report,
			producer: "future-cli",
			checks: [
				{
					...report.checks[0],
					evidence: { confidence: 0.98 },
					issues: [{ severity: "info", message: "heads up", sourceRange: { start: 1, end: 2 } }],
				},
			],
			meta: {
				...report.meta,
				commitSha: "abc123",
				stack: { ...report.meta.stack, runtime: "deno" },
			},
		}) as typeof report & {
			producer: string;
			checks: [{ evidence: { confidence: number }; issues: [{ sourceRange: { start: number; end: number } }] }];
			meta: { commitSha: string; stack: { runtime: string } };
		};

		expect(parsed.producer).toBe("future-cli");
		expect(parsed.checks[0].evidence.confidence).toBe(0.98);
		expect(parsed.checks[0].issues[0].sourceRange.start).toBe(1);
		expect(parsed.meta.commitSha).toBe("abc123");
		expect(parsed.meta.stack.runtime).toBe("deno");
	});

	it("rejects malformed reports loudly", () => {
		expect(() => parseReport({ ...report, checks: [{ name: "structure" }] })).toThrow();
		expect(() => parseReport({ ...report, grade: "Z" })).toThrow();
		expect(() => parseReport({ ...report, checks: [{ ...report.checks[0], issues: [{ severity: "notice", message: "nope" }] }] })).toThrow();
	});

	it("keeps grade thresholds stable", () => {
		expect(gradeFromScore(90)).toBe("A");
		expect(gradeFromScore(75)).toBe("B");
		expect(gradeFromScore(60)).toBe("C");
		expect(gradeFromScore(40)).toBe("D");
		expect(gradeFromScore(39)).toBe("F");
	});
});

describe("components (0.3.0)", () => {
	it("accepts stack.components and preserves it", () => {
		const r = structuredClone(report);
		(r.meta.stack as Record<string, unknown>).components = ["cloudflare-workers", "sqlite-d1"];
		const parsed = parseReport(r);
		expect(parsed.meta.stack.components).toEqual(["cloudflare-workers", "sqlite-d1"]);
	});

	it("accepts Cloudflare Worker MCP reports", () => {
		const r = structuredClone(report);
		r.checks = [
			{
				name: "cloudflare-worker-mcp",
				score: 100,
				grade: "A",
				details: { tools: 3, authRequired: true },
				issues: [],
				duration: 2,
			},
		];
		(r.meta.stack as Record<string, unknown>).components = ["cloudflare-workers", "mcp-server"];

		const parsed = parseReport(r);

		expect(parsed.checks[0]?.name).toBe("cloudflare-worker-mcp");
		expect(parsed.meta.stack.components).toEqual(["cloudflare-workers", "mcp-server"]);
	});

	it("stays optional — reports without components still parse", () => {
		expect(() => parseReport(structuredClone(report))).not.toThrow();
	});
});

describe("repo metric history contract", () => {
	const metricHistory = {
		version: "1",
		generatedAt: "2026-08-14T00:00:00.000Z",
		owner: "vibecodeqa",
		repo: "app",
		branch: "main",
		defaultBranch: "main",
		window: {
			from: "2026-08-01T00:00:00.000Z",
			to: "2026-08-14T00:00:00.000Z",
			limit: 30,
		},
		series: [
			{
				id: "overall.score",
				kind: "overall",
				label: "Overall score",
				metricId: "score",
				unit: "score",
				trend: "higher-is-better",
				points: [
					{ timestamp: "2026-08-13T00:00:00.000Z", value: 91, grade: "A", reportId: "r1", commitSha: "abc123", branch: "main" },
					{ timestamp: "2026-08-14T00:00:00.000Z", value: 92, grade: "A", reportId: "r2", commitSha: "def456", branch: "main" },
				],
			},
			{
				id: "check.testing.score",
				kind: "check",
				label: "Testing score",
				checkName: "testing",
				metricId: "score",
				unit: "score",
				trend: "higher-is-better",
				points: [
					{ timestamp: "2026-08-13T00:00:00.000Z", value: 78 },
					{ timestamp: "2026-08-14T00:00:00.000Z", value: 83 },
				],
			},
			{
				id: "analyzer.react.jsxFiles",
				kind: "analyzer",
				label: "React JSX/TSX files",
				analyzerId: "react",
				metricId: "jsxFiles",
				unit: "count",
				trend: "neutral",
				points: [
					{ timestamp: "2026-08-13T00:00:00.000Z", value: 12 },
					{ timestamp: "2026-08-14T00:00:00.000Z", value: 14 },
				],
			},
		],
	};

	it("validates compact overall, check, and analyzer metric series", () => {
		const parsed = parseRepoMetricHistoryResponse(metricHistory);

		expect(parsed.series.map((series) => series.kind)).toEqual(["overall", "check", "analyzer"]);
		expect(RepoMetricHistoryResponseSchema.parse(metricHistory).series[2]?.points[1]?.value).toBe(14);
	});

	it("rejects malformed graph points and missing discriminator fields", () => {
		expect(safeParseRepoMetricHistoryResponse({
			...metricHistory,
			series: [{ ...metricHistory.series[0], points: [{ timestamp: "2026-08-14T00:00:00.000Z", value: "92" }] }],
		}).success).toBe(false);

		expect(safeParseRepoMetricHistoryResponse({
			...metricHistory,
			series: [{ ...metricHistory.series[1], checkName: undefined }],
		}).success).toBe(false);

		expect(safeParseRepoMetricHistoryResponse({
			...metricHistory,
			series: [{ ...metricHistory.series[2], analyzerId: undefined }],
		}).success).toBe(false);
	});

	it("rejects unsupported metric-history units and trends", () => {
		expect(() => parseRepoMetricHistoryResponse({
			...metricHistory,
			series: [{ ...metricHistory.series[0], unit: "lines" }],
		})).toThrow();

		expect(() => parseRepoMetricHistoryResponse({
			...metricHistory,
			series: [{ ...metricHistory.series[0], trend: "up-good" }],
		})).toThrow();
	});
});
