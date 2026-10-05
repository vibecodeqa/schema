# @vibecodeqa/schema

Shared report contract for VibeCode QA.

This package is intentionally a tiny leaf dependency:

- report types
- check metadata
- category weight rollups
- Zod runtime validation

It does not contain scanning logic, file IO, React, Tauri, MCP, or GitHub code.

## Usage

```ts
import { CHECK_META, parseReport, parseRepoMetricHistoryResponse, type VibeReport } from "@vibecodeqa/schema";

const report: VibeReport = parseReport(json);
const checkCount = Object.keys(CHECK_META).length;
const history = parseRepoMetricHistoryResponse(metricHistoryJson);
```

`parseReport()` keeps the report shape strict where the vocabulary is truly closed
(`grade`, issue `severity`) and forward-compatible where producers evolve over time
(stack detector values, workspace tool names, and extra report fields). Consumers can
validate reports without dropping future CLI data.

Reports may include optional `meta.analyzerSnapshots`, a normalized analyzer summary
contract for scores, finding counts, severity counts, and trendable analyzer metrics.
`parseRepoMetricHistoryResponse()` validates the compact per-repo graphing payload
used by hosted dashboards: overall series, per-check series, and analyzer metric
series with numeric history points.

## Scan provenance (0.6.0)

A report can say what it measured. All of these are optional — reports from older
producers parse unchanged — and every object stays forward-compatible (`.passthrough()`).

| Field | Meaning |
| --- | --- |
| `meta.source` | Producer of the report: `"cli"` from the CLI, `"cloudflare-server-scan"` from the hosted scan. |
| `meta.fingerprintVersion` | Version of the `Issue.fingerprint` derivation. Absent means 1. Compare fingerprints only between reports of the same version. |
| `meta.scan.id` | Unique id (UUID) for the scan. |
| `meta.scan.skipTests` | The scan was run with tests skipped. |
| `meta.scan.diffBase` | Base ref the issues were filtered against (`--diff`). Non-null means `checks[].issues` is **partial**. `null` = full scan. |
| `meta.git.sha` | Commit that was checked out and scanned. |
| `meta.git.headSha` | PR head commit — use it for attribution and commit statuses. Equal to `sha` off a PR. |
| `meta.git.baseSha` | PR base commit. |
| `meta.git.branch` / `meta.git.ref` | Branch name and full ref (e.g. `refs/pull/12/merge`). |
| `meta.git.prNumber` | Pull request number, or `null`. |
| `meta.git.commitDate` | ISO timestamp of the scanned commit. |
| `meta.git.defaultBranch` | Repository default branch. |
| `meta.ci` | The CI run that produced the report: `provider` (`"github-actions"`; open vocabulary), `runId`, `runAttempt`, `runUrl`, `event`, `actor`. `null` = known not to be a CI run. |
| `checks[].status` | Check outcome. Known values: `passed`, `failed`, `skipped`, `unavailable`. **Open vocabulary** — producers may add others (e.g. `error`, `timeout`); treat an unknown value as "ran". Read this instead of inferring from `score` — skipped and unavailable checks carry a placeholder score. |
| `checks[].issues[].fingerprint` | Stable identity of a finding across scans (versioned by `meta.fingerprintVersion`). |
| `checks[].issues[].subject` | Producer-chosen identity anchor (e.g. a function name) that feeds the fingerprint in place of a message embedding a measurement. Opaque. |

Provenance is advisory and validated leniently: every field inside `meta.git`,
`meta.ci` and `meta.scan` is optional and nullable (a scan outside a git checkout, or on a
shallow or detached clone, may not know it). A provenance block — or `source`,
`fingerprintVersion`, an issue's `fingerprint`/`subject` — that is still malformed
(wrong types) is **dropped** by `parseReport()`, never fatal: a report is not rejected
because its provenance is imperfect.

**On a GitHub `pull_request` run, `meta.git.sha` is GitHub's synthetic merge commit
(head merged into base), not the PR head.** That is the tree that was actually scanned.
Use `meta.git.headSha` to attribute results to the PR or to post commit statuses.

## Publishing

This package is intended to be published publicly as `@vibecodeqa/schema`.

The GitHub workflow uses npm OIDC trusted publishing. Before the first release, configure
the npm package/scope to trust the `vibecodeqa/schema` repository workflow:

- package: `@vibecodeqa/schema`
- workflow: `.github/workflows/publish.yml`
- environment: none

Local verification:

```sh
pnpm build
pnpm test
npm publish --dry-run --access public
```
