# Releasing @civfix/contract

Versions come from changesets; never edit `package.json`'s version by hand, except in the one case
below.

1. On your branch, run `pnpm changeset` and describe the change for consumers. On `0.x`, an additive
   change is a **minor** (consumers must move their caret range to get it); a fix that changes no
   shape is a **patch**.
2. Before merging, run `pnpm changeset version`. It bumps `package.json` and writes `CHANGELOG.md`;
   commit both with the change.
3. Merging to `main` runs `publish.yml`: it tags `@civfix/contract@X.Y.Z` on `main` and publishes to
   `https://repo.civfix.org`. A run with nothing new to publish does nothing.
4. Adopt the new version in every consumer (civfix-app, civfix-backend, civfix-admin) in the same
   delivery set: a new minor needs the caret range edited, then `pnpm install`; an in-range patch
   needs `pnpm update @civfix/contract`, because a plain `pnpm install` leaves the lockfile as it is.
   Commit the manifest and the lockfile together.

Confirm what the registry holds with:

```sh
npm view @civfix/contract version --registry https://repo.civfix.org
```

## A consumer branch that needs an unmerged contract

```sh
gh workflow run publish-snapshot.yml -R civfix/civfix-contract --ref <branch>
```

publishes `<version>-b-<branch slug>.g<sha7>` under the `snapshot` dist-tag. No caret range matches a
prerelease, so the consumer pins that exact version, and moves back to a caret range once `main` has
published the real one. Never merge a consumer PR that pins a snapshot.

## When the version check fails

`scripts/check-version.mjs` (run on every PR and before every publish) refuses a version the registry
already holds from a commit `main` never released, and prints the next free version. That is the one
case where you set `package.json`'s version by hand, together with the matching `CHANGELOG.md`
heading.
