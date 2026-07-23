import { z } from "zod";
import type { StackInfo, VibeReport, WorkspaceInfo } from "./types.js";

export const GradeSchema = z.enum(["A", "B", "C", "D", "F"]);
export const SeveritySchema = z.enum(["error", "warning", "info"]);

function openString<T extends string>(): z.ZodType<T> {
	return z.string() as unknown as z.ZodType<T>;
}

export const IssueSchema = z.object({
	severity: SeveritySchema,
	message: z.string(),
	file: z.string().optional(),
	line: z.number().optional(),
	rule: z.string().optional(),
	snippet: z.string().optional(),
}).passthrough();

export const CheckResultSchema = z.object({
	name: z.string(),
	score: z.number(),
	grade: GradeSchema,
	details: z.record(z.unknown()),
	issues: z.array(IssueSchema),
	duration: z.number(),
}).passthrough();

export const StackInfoSchema = z.object({
	language: openString<StackInfo["language"]>(),
	framework: openString<StackInfo["framework"]>(),
	bundler: openString<StackInfo["bundler"]>(),
	testRunner: openString<StackInfo["testRunner"]>(),
	linter: openString<StackInfo["linter"]>(),
	packageManager: openString<StackInfo["packageManager"]>(),
}).passthrough();

export const WorkspacePackageSchema = z.object({
	name: z.string(),
	path: z.string(),
	hasSrc: z.boolean(),
	hasRootCode: z.boolean(),
	hasTests: z.boolean(),
	hasLinter: z.boolean(),
}).passthrough();

export const WorkspaceInfoSchema = z.object({
	isMonorepo: z.boolean(),
	tool: openString<WorkspaceInfo["tool"]>(),
	packages: z.array(WorkspacePackageSchema),
	srcRoots: z.array(z.string()),
}).passthrough();

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
	}).passthrough(),
}).passthrough();

export function parseReport(json: unknown): VibeReport {
	return VibeReportSchema.parse(json);
}

export function safeParseReport(json: unknown) {
	return VibeReportSchema.safeParse(json);
}
