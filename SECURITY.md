# Security Policy

## Supported Versions

Until Open Grid reaches 1.0, security fixes are provided for the latest published
minor release only. Users should reproduce a report against the latest release or
the current `main` branch when possible.

| Version | Supported |
| --- | --- |
| Latest 0.x minor | Yes |
| Older 0.x minors | No |

## Reporting a Vulnerability

Use GitHub's private
[security advisory form](https://github.com/Goatshave/open-grid/security/advisories/new).
Do not open a public issue for a suspected vulnerability.

Include the affected package and version, impact, reproduction steps or a minimal
case, and any known mitigation. Remove credentials and private data. A maintainer
will aim to acknowledge a complete report within seven days and will coordinate
validation, remediation, and disclosure through the advisory. Timing depends on
severity and the complexity of a compatible fix.

If private vulnerability reporting is unavailable in the repository, email
[junghyeonkim.dev@gmail.com](mailto:junghyeonkim.dev@gmail.com) to arrange a secure
reporting channel. Do not include vulnerability details in the initial email.

## Dependency maintenance

CI and Release Publish run `pnpm security:audit`. Known compatibility-fixture and
unpatched upstream findings require dated, path-scoped review as described in
[Dependency security](docs/dependency-security.md). Automatic Dependabot security
update pull requests and private vulnerability reporting are enabled.
