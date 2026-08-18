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
