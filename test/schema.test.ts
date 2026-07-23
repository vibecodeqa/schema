import { describe, expect, it } from "vitest";
import { CHECK_META, CATEGORY_WEIGHTS, VibeReportSchema, getCategoryWeights, gradeFromScore, parseReport } from "../src/index.js";

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

describe("@vibecodeqa/schema", () => {
	it("exports canonical check metadata", () => {
		expect(Object.keys(CHECK_META)).toHaveLength(36);
		expect(CHECK_META.testing.weight).toBe(13);
		expect(CHECK_META["frontend-health"]).toBeDefined();
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

	it("stays optional — reports without components still parse", () => {
		expect(() => parseReport(structuredClone(report))).not.toThrow();
	});
});
