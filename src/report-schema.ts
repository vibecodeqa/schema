import { z } from "zod";
import type {
	AnalyzerMetric,
	AnalyzerSnapshot,
	RepoMetricHistoryResponse,
	RepoMetricHistorySeries,
	StackInfo,
	VibeReport,
	WorkspaceInfo,
} from "./types.js";

export const GradeSchema = z.enum(["A", "B", "C", "D", "F"]);
export const SeveritySchema = z.enum(["error", "warning", "info"]);
export const MetricUnitSchema = z.enum(["count", "percent", "ms", "bytes", "score"]);
export const MetricTrendSchema = z.enum(["higher-is-better", "lower-is-better", "neutral"]);

function openString<T extends string>(): z.ZodType<T> {
	return z.string() as unknown as z.ZodType<T>;
}

const FiniteNumberSchema = z.number().finite();

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

export const AnalyzerMetricSchema: z.ZodType<AnalyzerMetric> = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	value: z.union([FiniteNumberSchema, z.string(), z.boolean()]),
	unit: MetricUnitSchema.optional(),
	trend: MetricTrendSchema.optional(),
}).passthrough();

export const AnalyzerSnapshotSchema: z.ZodType<AnalyzerSnapshot> = z.object({
	analyzerId: z.string().min(1),
	status: openString<AnalyzerSnapshot["status"]>(),
	score: FiniteNumberSchema.optional(),
	findingCount: FiniteNumberSchema,
	severityCounts: z.record(FiniteNumberSchema),
	metrics: z.array(AnalyzerMetricSchema),
	durationMs: FiniteNumberSchema,
}).passthrough();

export const StackInfoSchema = z.object({
	language: openString<StackInfo["language"]>(),
	framework: openString<StackInfo["framework"]>(),
	bundler: openString<StackInfo["bundler"]>(),
	testRunner: openString<StackInfo["testRunner"]>(),
	linter: openString<StackInfo["linter"]>(),
	packageManager: openString<StackInfo["packageManager"]>(),
	components: z.array(z.string()).optional(),
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
		filesScanned: z.number().optional(),
		analyzerSnapshots: z.array(AnalyzerSnapshotSchema).optional(),
	}).passthrough(),
}).passthrough();

export const RepoMetricHistoryPointSchema = z.object({
	timestamp: z.string(),
	value: FiniteNumberSchema,
	grade: GradeSchema.optional(),
	reportId: z.string().optional(),
	commitSha: z.string().optional(),
	branch: z.string().optional(),
}).passthrough();

const RepoMetricHistorySeriesBaseSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	metricId: z.string().min(1),
	unit: MetricUnitSchema.optional(),
	trend: MetricTrendSchema.optional(),
	points: z.array(RepoMetricHistoryPointSchema),
});

export const RepoOverallMetricHistorySeriesSchema = RepoMetricHistorySeriesBaseSchema.extend({
	kind: z.literal("overall"),
}).passthrough();

export const RepoCheckMetricHistorySeriesSchema = RepoMetricHistorySeriesBaseSchema.extend({
	kind: z.literal("check"),
	checkName: z.string().min(1),
}).passthrough();

export const RepoAnalyzerMetricHistorySeriesSchema = RepoMetricHistorySeriesBaseSchema.extend({
	kind: z.literal("analyzer"),
	analyzerId: z.string().min(1),
}).passthrough();

export const RepoMetricHistorySeriesSchema: z.ZodType<RepoMetricHistorySeries> = z.discriminatedUnion("kind", [
	RepoOverallMetricHistorySeriesSchema,
	RepoCheckMetricHistorySeriesSchema,
	RepoAnalyzerMetricHistorySeriesSchema,
]);

export const RepoMetricHistoryWindowSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
	limit: z.number().int().positive().optional(),
}).passthrough();

export const RepoMetricHistoryResponseSchema: z.ZodType<RepoMetricHistoryResponse> = z.object({
	version: z.string(),
	generatedAt: z.string(),
	owner: z.string().min(1),
	repo: z.string().min(1),
	branch: z.string().optional(),
	defaultBranch: z.string().optional(),
	window: RepoMetricHistoryWindowSchema.optional(),
	series: z.array(RepoMetricHistorySeriesSchema),
}).passthrough();

export function parseReport(json: unknown): VibeReport {
	return VibeReportSchema.parse(json);
}

export function safeParseReport(json: unknown) {
	return VibeReportSchema.safeParse(json);
}

export function parseRepoMetricHistoryResponse(json: unknown): RepoMetricHistoryResponse {
	return RepoMetricHistoryResponseSchema.parse(json);
}

export function safeParseRepoMetricHistoryResponse(json: unknown) {
	return RepoMetricHistoryResponseSchema.safeParse(json);
}
