# @civfix/contract

The API contract between the civfix backend and its clients: Zod schemas and their inferred types,
the `endpoints` registry, `AppError`/`ErrorCode`, the typed API client, and the domain helpers both
sides run (host rules, markdown, calendar export, legal documents, avatar gradients, date and geo
helpers). The only runtime dependency is `zod`; it builds to ESM, CJS and `.d.ts` with tsup.

It contains no app code, no UI and no vendor SDKs. React, React Native, `@civfix/ui` and
`@civfix/tokens` are banned by lint: the backend installs this package and must not pull any of them
in through it.

## Consumers

Installed from the private Verdaccio registry at `https://repo.civfix.org` (scope `@civfix`, anonymous
read) by:

| Repo | Workspaces |
| --- | --- |
| civfix-app | `packages/ui`, `apps/community-web`, `apps/community-mobile` |
| civfix-backend | `services/api`, `services/media-worker`, `packages/seams` |
| civfix-admin | `apps/admin` |

Each consumer scopes `@civfix` to the registry in its `.npmrc` and pins a caret range. On `0.x` a caret
range pins the minor (`^0.62.0` accepts `0.62.x`, never `0.63.0`), so every new minor needs a range
change in every consumer.

## Subpaths

`@civfix/contract` (everything), and `/client`, `/avatar`, `/datetime`, `/geocode`, `/host`,
`/markdown`, `/ics`, `/legal`. The build splits shared code into common chunks so every subpath uses
the same `AppError` class; `instanceof` across subpaths depends on it (`tsup.config.ts`).

## Develop

```sh
pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

To try an unmerged change in a consumer branch, publish a snapshot (see `RELEASING.md`).

## History

Until 0.61.0 this package was `@civfix/shared` in `civfix-app/packages/shared`; its git history
came with it. The design tokens moved to `@civfix/tokens` (civfix-app), the seam interfaces and fakes
to `@civfix/seams` (civfix-backend), and the app-only helpers to `@civfix/ui`. `DECISIONS.md` keeps
every decision, including the few that now apply to those packages.

## License

AGPL-3.0-only, with the App Store and Play distribution exception in `LICENSE-EXCEPTIONS.md` (the
community apps bundle this package). Contributions need the CLA in `CLA.md`; see `CONTRIBUTING.md`.
