# Contributing to civfix

civfix is a civic-tech platform that runs in production for real residents
and holds government contracts. The bar for every change is production
quality: correct, secure, fast, reviewed.

## License and contributor agreement

This repository is licensed under the GNU Affero General Public License,
version 3 only (`LICENSE`). civfix is a project of Reach Out Los Angeles Inc. By
contributing you agree to the civfix Individual Contributor License Agreement
in `CLA.md`, which lets Reach Out Los Angeles Inc. distribute your work under the
AGPL, under the additional permissions the project carries, and under
commercial terms when a government customer requires them. Until the automated
agreement check is in place, state your acceptance in your first pull request
as `CLA.md` describes.

Never add a dependency whose license is incompatible with the AGPLv3 (for
example SSPL, BUSL, Commons Clause or Creative Commons NonCommercial).
`pnpm licenses list --prod` is the check to run before a pull request that
adds one.

## How changes land

- Branch from a just-pulled `main` (`fix/<slug>`, `feat/<slug>`,
  `chore/<slug>`) and open a pull request against `main`. CI must be green
  before it merges, and merges are squash merges.
- Every contract change is backward-compatible by default: new response
  fields are optional, nullable or defaulted, and request schemas stay
  `.strict()`. Read `DECISIONS.md` before changing a schema.
- Add a changeset (`pnpm changeset`) and run `pnpm changeset version` before
  merging; `RELEASING.md` describes the release and how consumers adopt it.
- Keep pull requests reviewable: one logical change, at most 1000 changed
  lines of hand-written code and never more than 2000. The description says
  briefly what changed and links the issue it resolves.
- Commit messages are short, plain, single-line summaries.

## Code expectations

- Match the surrounding idioms; relative imports end in `.js`.
- No framework, UI or vendor-SDK imports: the backend installs this package.
- Add or update tests with the change. Typecheck, lint and tests pass before
  the PR opens.
