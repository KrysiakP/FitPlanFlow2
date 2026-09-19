---
name: Dependency scan scope
description: Why inactive package-manager lockfiles can keep dependency findings alive.
---

Dependency scanners inspect lockfiles throughout the repository, including inactive migration or backup directories.

**Why:** A clean audit of the active pnpm workspace can still leave platform findings if a legacy package-lock records vulnerable versions.

**How to apply:** When dependency findings disagree with the active package manager's audit, search all tracked lockfiles. Remove obsolete lockfiles rather than weakening package policies or adding irrelevant overrides.