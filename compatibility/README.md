# Framework Compatibility Fixtures

These private workspace projects verify the oldest framework versions in the 0.1
support contract. Current framework versions are covered by the maintained examples
and browser smoke suite.

Run package builds first, then the compatibility checks:

```bash
pnpm build
pnpm compatibility:check
```

The fixtures are not published to npm.
