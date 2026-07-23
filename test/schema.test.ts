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
		expect(Object.keys(CHECK_META)).toHaveLength(34);
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

	it("rejects malformed reports loudly", () => {
		expect(() => parseReport({ ...report, checks: [{ name: "structure" }] })).toThrow();
		expect(() => parseReport({ ...report, grade: "Z" })).toThrow();
	});

	it("keeps grade thresholds stable", () => {
		expect(gradeFromScore(90)).toBe("A");
		expect(gradeFromScore(75)).toBe("B");
		expect(gradeFromScore(60)).toBe("C");
		expect(gradeFromScore(40)).toBe("D");
		expect(gradeFromScore(39)).toBe("F");
	});
});
