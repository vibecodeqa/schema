/** Shared types for vibe-check */

export type Grade = "A" | "B" | "C" | "D" | "F";
export type Severity = "error" | "warning" | "info";

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
	};
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
