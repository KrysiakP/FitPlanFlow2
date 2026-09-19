---
name: Security overrides and build tools
description: Why dependency security overrides must be verified against real Expo bundle generation.
---

Security overrides for transitive build-tool dependencies must be verified by producing real iOS and Android bundles, not only by installing packages or running a vulnerability scan.

**Why:** A secure major version of a transitive image-inspection library changed its accepted input type while Metro still used the older contract. Installation and web/API builds passed, but Expo bundling failed late with an unhelpful HTTP 500.

**How to apply:** After changing workspace-wide overrides that affect Metro, Expo, bundlers, parsers, or asset tooling, run the production mobile export path for every supported platform. Prefer a narrow compatibility patch over downgrading to a vulnerable version.