# Deployment security

This site is a static Docusaurus build on Cloudflare Pages. It does not need a
Worker route in front of its custom domain to serve documentation.

## Reproducible builds

- Use the Node version in `.node-version` and install from `bun.lock` with
  `bun install --frozen-lockfile --ignore-scripts`.
- Run `bun run typecheck` and `bun run build` before deploying.
- Deploy the complete `build/` directory, including the generated `_headers` file.
- The build hashes Docusaurus's inline bootstrap scripts. The CSP permits those
  exact scripts and same-origin bundles, but does not permit arbitrary inline
  JavaScript, `eval`, or connections to external script servers.
- Do not add `unsafe-inline` or `unsafe-eval` to `script-src` to resolve errors.
  Rebuild both locales so the allowed hashes are regenerated.

## Cloudflare account controls

Protect dashboard access with MFA/passkeys, review active sessions and account
members, and rotate exposed API credentials from a trusted device. Restrict
deployment tokens to the resources and permissions actually needed. A static
documentation deployment should not need permission to edit every zone's
Worker routes.

After an incident, compare the custom domain's response with the project's
`pages.dev` address and inspect account audit logs and zone Worker routes.
Application dependency upgrades and CSP do not protect against an attacker who
still controls the Cloudflare account and can replace routing or headers.

## Remaining upstream advisory

The final dependency audit on 2026-10-21 reports
[`GHSA-vfj7-8cjw-p6xm`](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
in `braces` 3.0.3, with no patched release available at the time of review.
It concerns denial of service from deeply nested glob patterns in tooling.
Do not run the development server publicly or build untrusted contributions
with deployment credentials. The production deployment contains static files,
not a Node development server accepting glob patterns from visitors.
