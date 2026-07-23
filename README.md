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
import { CHECK_META, parseReport, type VibeReport } from "@vibecodeqa/schema";

const report: VibeReport = parseReport(json);
const checkCount = Object.keys(CHECK_META).length;
```

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
