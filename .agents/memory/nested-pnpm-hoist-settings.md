---
name: Nested pnpm hoist settings
description: How package-local pnpm configuration can conflict with workspace-root installs.
---

In a pnpm workspace, keep hoist configuration consistent between the workspace root and nested packages. A workspace installation performed with one hoist setting can make a later package-local add fail with a modules-directory configuration mismatch.

**Why:** Expo dependency alignment invokes pnpm from the mobile package directory. If that directory applies a different hoist mode than the command that created the shared workspace `node_modules`, Expo cannot update packages even when the lockfile itself is valid.

**How to apply:** Before dependency updates that run from a nested package, compare its effective pnpm hoist settings with the workspace installation. If they differ, recreate the workspace modules using the package's effective settings or consolidate the setting at workspace scope.