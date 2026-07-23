import { z } from "zod";
import type { VibeReport } from "./types.js";

export const GradeSchema = z.enum(["A", "B", "C", "D", "F"]);
export const SeveritySchema = z.enum(["error", "warning", "info"]);

export const IssueSchema = z.object({
	severity: SeveritySchema,
	message: z.string(),
	file: z.string().optional(),
	line: z.number().optional(),
	rule: z.string().optional(),
	snippet: z.string().optional(),
});

export const CheckResultSchema = z.object({
	name: z.string(),
	score: z.number(),
	grade: GradeSchema,
	details: z.record(z.unknown()),
	issues: z.array(IssueSchema),
	duration: z.number(),
});

export const StackInfoSchema = z.object({
	language: z.enum(["typescript", "javascript", "dart", "unknown"]),
	framework: z.enum(["react", "vue", "svelte", "flutter", "none", "unknown"]),
	bundler: z.enum(["vite", "webpack", "esbuild", "none", "unknown"]),
	testRunner: z.enum(["vitest", "jest", "flutter_test", "dart_test", "none", "unknown"]),
	linter: z.enum(["biome", "eslint", "dart_analyze", "none", "unknown"]),
	packageManager: z.enum(["pnpm", "npm", "yarn", "bun", "pub", "unknown"]),
});

export const WorkspacePackageSchema = z.object({
	name: z.string(),
	path: z.string(),
	hasSrc: z.boolean(),
	hasRootCode: z.boolean(),
	hasTests: z.boolean(),
	hasLinter: z.boolean(),
});

export const WorkspaceInfoSchema = z.object({
	isMonorepo: z.boolean(),
	tool: z.enum(["pnpm", "npm", "yarn", "bun", "lerna", "turborepo", "nx", "melos", "none"]),
	packages: z.array(WorkspacePackageSchema),
	srcRoots: z.array(z.string()),
});

export const VibeReportSchema = z.object({
	version: z.string(),
	timestamp: z.string(),
	score: z.number(),
	grade: GradeSchema,
	checks: z.array(CheckResultSchema),
	meta: z.object({
		cwd: z.string(),
		node: z.string(),
		duration: z.number(),
		stack: StackInfoSchema,
		workspace: WorkspaceInfoSchema.optional(),
		repoUrl: z.string().nullable(),
		branch: z.string(),
	}),
});

export function parseReport(json: unknown): VibeReport {
	return VibeReportSchema.parse(json);
}

export function safeParseReport(json: unknown) {
	return VibeReportSchema.safeParse(json);
}
