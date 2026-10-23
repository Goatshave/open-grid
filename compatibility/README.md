# Framework Compatibility Fixtures

These private workspace projects verify the oldest framework versions in the 0.1
support contract. Current framework versions are covered by the maintained examples
and browser smoke suite.

Run package builds first, then the compatibility checks:

```bash
pnpm build
pnpm compatibility:check
```

The fixtures are not published to npm. They are build/typecheck inputs, not runnable
examples. The Svelte 4 fixture retains Vite 5 for its framework lower-bound check
and rejects dev and preview server commands. Use the maintained examples for local
development. See [Dependency security](../docs/dependency-security.md) for the
reviewed advisory scope and expiry.
