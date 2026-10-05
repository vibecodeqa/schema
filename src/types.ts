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
	/** Outcome of the check, written by CLI >= 0.54. Read this instead of
	 *  inferring from `score`: a skipped or unavailable check still carries a
	 *  placeholder score. Absent on older reports. */
	status?: "passed" | "failed" | "skipped" | "unavailable";
}

export interface Issue {
	severity: Severity;
	message: string;
	file?: string;
	line?: number;
	rule?: string;
	snippet?: string; // copyable code snippet (e.g., duplicated block for search)
	/** Stable identity of this finding across scans, used by trend/delta to
	 *  tell "fixed" and "new" apart. Opaque; how it is derived is versioned by
	 *  `meta.fingerprintVersion`. */
	fingerprint?: string;
	/** Producer-chosen identity anchor for the finding (e.g. a function name,
	 *  or a clone pair without line numbers) that feeds the fingerprint in
	 *  place of a message that embeds a measurement. Opaque to consumers. */
	subject?: string;
}

/** Git state of the tree that was scanned. Every field is nullable: a scan
 *  outside a git checkout, or on a detached/shallow clone, may not know it.
 *
 *  On a GitHub `pull_request` run the checked-out commit is GitHub's
 *  synthetic merge of head into base, so `sha` is that merge commit — not
 *  the PR head. Use `headSha` to attribute results or post commit statuses. */
export interface ReportGitProvenance {
	/** Commit that was checked out and scanned (the merge sha on a PR run). */
	sha: string | null;
	/** PR head commit; equal to `sha` when not on a PR. */
	headSha: string | null;
	/** PR base commit, when on a PR. */
	baseSha: string | null;
	/** Branch name, e.g. "main" or the PR head branch. */
	branch: string | null;
	/** Full ref, e.g. "refs/heads/main" or "refs/pull/12/merge". */
	ref: string | null;
	prNumber: number | null;
	/** ISO timestamp of the scanned commit. */
	commitDate: string | null;
	defaultBranch: string | null;
}

export type CiProvider = "github-actions" | (string & {});

/** The CI run that produced the report. */
export interface ReportCiProvenance {
	provider: CiProvider;
	runId: string;
	runAttempt: number;
	runUrl: string;
	/** Triggering event, e.g. "push" or "pull_request". */
	event: string;
	actor: string | null;
}

/** How the scan was run — the options that change what a report covers. */
export interface ReportScanInfo {
	/** Unique id for this scan (a UUID). */
	id: string;
	skipTests: boolean;
	/** Base ref the report was filtered against (`--diff`); null = full scan.
	 *  When set, `checks[].issues` is partial. */
	diffBase: string | null;
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
		/** Who produced the report, e.g. "cli" or "cloudflare-server-scan". */
		source?: string;
		/** Version of the `Issue.fingerprint` derivation. Absent = 1. */
		fingerprintVersion?: number;
		scan?: ReportScanInfo;
		git?: ReportGitProvenance;
		/** CI run that produced the report; null = known not to be CI. */
		ci?: ReportCiProvenance | null;
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
	 *  "cloudflare-r2", "durable-objects", "mcp-server". Absent = none detected. */
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
