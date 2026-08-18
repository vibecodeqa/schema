/** Shared types for vibe-check */

export type Grade = "A" | "B" | "C" | "D" | "F";
export type Severity = "error" | "warning" | "info";
export type MetricUnit = "count" | "percent" | "ms" | "bytes" | "score";
export type MetricTrend = "higher-is-better" | "lower-is-better" | "neutral";
export type AnalyzerStatus = "passed" | "failed" | "skipped" | "unavailable" | "error" | (string & {});
export type AnalyzerMetricValue = number | string | boolean;

export type StackLanguage = "typescript" | "javascript" | "dart" | "unknown" | (string & {});
export type StackFramework = "react" | "vue" | "svelte" | "flutter" | "none" | "unknown" | (string & {});
export type StackBundler = "vite" | "webpack" | "esbuild" | "none" | "unknown" | (string & {});
export type StackTestRunner = "vitest" | "jest" | "flutter_test" | "dart_test" | "none" | "unknown" | (string & {});
export type StackLinter = "biome" | "eslint" | "dart_analyze" | "none" | "unknown" | (string & {});
export type StackPackageManager = "pnpm" | "npm" | "yarn" | "bun" | "pub" | "unknown" | (string & {});
export type WorkspaceTool = "pnpm" | "npm" | "yarn" | "bun" | "lerna" | "turborepo" | "nx" | "melos" | "none" | (string & {});

/** Provenance for one delegated tool invocation, recorded by the CLI so a
 *  report can be audited: what ran, where, and what it said. */
export interface ToolRun {
	tool: string;
	command: string;
	cwd: string;
	ok: boolean;
	durationMs: number;
	output: string;
	notFound: boolean;
}

export interface CheckResult {
	name: string;
	score: number; // 0-100
	grade: Grade;
	details: Record<string, unknown>;
	issues: Issue[];
	duration: number; // ms
}

export interface Issue {
	severity: Severity;
	message: string;
	file?: string;
	line?: number;
	rule?: string;
	snippet?: string; // copyable code snippet (e.g., duplicated block for search)
}

export interface AnalyzerMetric {
	id: string;
	label: string;
	value: AnalyzerMetricValue;
	unit?: MetricUnit;
	trend?: MetricTrend;
}

export interface AnalyzerSnapshot {
	analyzerId: string;
	status: AnalyzerStatus;
	score?: number;
	findingCount: number;
	severityCounts: Record<string, number>;
	metrics: AnalyzerMetric[];
	durationMs: number;
}

export interface VibeReport {
	version: string;
	timestamp: string;
	score: number; // 0-100 composite
	grade: Grade;
	checks: CheckResult[];
	meta: {
		cwd: string;
		node: string;
		duration: number; // total ms
		stack: StackInfo;
		workspace?: WorkspaceInfo;
		repoUrl: string | null; // GitHub/GitLab URL for file links
		branch: string;
		/** Source files the scan walked — lets a reader sanity-check a result
		 *  against the size of their project instead of taking it on faith. */
		filesScanned?: number;
		/** Normalized analyzer summaries emitted by newer scanners. Optional so
		 *  historical reports and older CLI releases remain valid. */
		analyzerSnapshots?: AnalyzerSnapshot[];
	};
}

export interface RepoMetricHistoryPoint {
	timestamp: string;
	value: number;
	grade?: Grade;
	reportId?: string;
	commitSha?: string;
	branch?: string;
}

export interface RepoMetricHistorySeriesBase {
	/** Stable graph id, e.g. "overall.score" or "analyzer.react.jsxFiles". */
	id: string;
	label: string;
	metricId: string;
	unit?: MetricUnit;
	trend?: MetricTrend;
	points: RepoMetricHistoryPoint[];
}

export interface RepoOverallMetricHistorySeries extends RepoMetricHistorySeriesBase {
	kind: "overall";
}

export interface RepoCheckMetricHistorySeries extends RepoMetricHistorySeriesBase {
	kind: "check";
	checkName: string;
}

export interface RepoAnalyzerMetricHistorySeries extends RepoMetricHistorySeriesBase {
	kind: "analyzer";
	analyzerId: string;
}

export type RepoMetricHistorySeries =
	| RepoOverallMetricHistorySeries
	| RepoCheckMetricHistorySeries
	| RepoAnalyzerMetricHistorySeries;

export interface RepoMetricHistoryWindow {
	from?: string;
	to?: string;
	limit?: number;
}

export interface RepoMetricHistoryResponse {
	version: string;
	generatedAt: string;
	owner: string;
	repo: string;
	branch?: string;
	defaultBranch?: string;
	window?: RepoMetricHistoryWindow;
	series: RepoMetricHistorySeries[];
}

export interface StackInfo {
	language: StackLanguage;
	framework: StackFramework;
	bundler: StackBundler;
	testRunner: StackTestRunner;
	linter: StackLinter;
	packageManager: StackPackageManager;
	/** Detected infrastructure/data components — open vocabulary. Known values:
	 *  "cloudflare-workers", "cloudflare-pages", "sqlite-d1", "cloudflare-kv",
	 *  "cloudflare-r2", "durable-objects". Absent = none detected. */
	components?: string[];
}

export interface WorkspacePackage {
	name: string; // e.g. "@org/sdk"
	path: string; // relative path e.g. "packages/sdk"
	hasSrc: boolean; // has src/, app/, or lib/ directory
	hasRootCode: boolean; // source files directly in package root (no src/ dir)
	hasTests: boolean;
	hasLinter: boolean;
}

export interface WorkspaceInfo {
	isMonorepo: boolean;
	tool: WorkspaceTool;
	packages: WorkspacePackage[];
	/** All directories containing source code (resolved from workspace packages) */
	srcRoots: string[];
}

export function gradeFromScore(score: number): Grade {
	if (score >= 90) return "A";
	if (score >= 75) return "B";
	if (score >= 60) return "C";
	if (score >= 40) return "D";
	return "F";
}
