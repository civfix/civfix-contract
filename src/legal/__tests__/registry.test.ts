import { describe, expect, it } from "vitest"
import { LEGAL_TEXTS, legalRecordSha256 } from "../../legal-texts/index.js"
import type { LegalDocumentType } from "../../schemas/common.js"
import type { LegalBlock } from "../blocks.js"
import { LEGAL_DOCUMENTS, type LegalDocumentVersion } from "../documents.js"
import PUBLISHED from "./published-hashes.json"
import { legalRegistryProblems, type LegalRegistry } from "./registry-invariants.js"

const PRE_EPIC: readonly LegalDocumentVersion[] = [
  ["terms", "2026-09-06", "4a4fcfac1a8d4ced63c4c033feb14df58a2db74632bdca37865fd5ab299a485e"],
  ["terms", "2026-09-16", "afa437255814c5fb39e75f7507304b7a2618aa1397bcdbe3d66129385515ca36"],
  ["terms", "2026-09-21", "52fe3908a8d7aa4427239a7555a2d7b2346d7a2b9730dfb539ecd157f6195772"],
  ["privacy", "2026-09-06", "91ba84fdeae76ed663b8711473e6c7b4ac5ae424925a663ea4383d4fe763b9dc"],
  ["privacy", "2026-09-16", "d3789e993ddee83cb5c556234694a9d0f200e5d99b533eba6ca3ca2053df9417"],
  ["privacy", "2026-09-21", "e7bb3df8d1bae0ebf3dac45021beb1f260c3035f2bf3cabd0201e2586eb2f127"],
  ["cookies", "2026-09-06", "a45a5d61d54b22c60e7de8ea2a76fc58ed48c26cfdcbd73c5a9e02f5fb9a30ed"],
  ["cookies", "2026-09-16", "4a05415bba1ef0301058815ce6d01f98eb593bd18378e7ce52555074da3064c0"],
  ["subprocessors", "2026-09-06", "e3debad19253777755713b14ed4f1e853737e7e755b722d16f622fb0641c56a9"],
  ["subprocessors", "2026-09-16", "5ab722bb37cc2972ada7521b6dc239bfd85f82691d0e3e2489f5dcac9983a198"],
].map(([type, version, sha256]) => ({
  type: type as LegalDocumentType,
  version: version as string,
  effectiveAt: `${version}T00:00:00.000Z`,
  url: `https://civfix.org/legal/${type}`,
  sha256: sha256 as string,
}))

const BLOCKS: readonly LegalBlock[] = [{ kind: "paragraph", text: "Hi" }]
const keyOf = (entry: { type: string; version: string }): string => `${entry.type}@${entry.version}`

function realRegistry(): LegalRegistry {
  return {
    documents: LEGAL_DOCUMENTS.map((entry) => ({ ...entry })),
    texts: { ...LEGAL_TEXTS },
    published: { ...PUBLISHED },
  }
}

/** A well-formed version written after this epic: metadata, blocks, its recomputed hash, published. */
function withEpicEntry(
  registry: LegalRegistry,
  type: LegalDocumentType,
  version: string,
  extra: Partial<LegalDocumentVersion> = {},
): LegalRegistry {
  const draft = {
    type,
    version,
    effectiveAt: "2026-10-25T00:00:00.000Z",
    url: `https://civfix.org/legal/${type}`,
    title: "Title",
    summary: "No change in wording",
    material: false,
    sha256: "",
    ...extra,
  }
  const entry = { ...draft, sha256: legalRecordSha256(draft, BLOCKS) }
  return {
    documents: [...registry.documents, entry],
    texts: { ...registry.texts, [keyOf(entry)]: BLOCKS },
    published: { ...registry.published, [keyOf(entry)]: entry.sha256 },
  }
}

/** A registry of one terms version: the seeded entry for a pre-epic version string, a new one otherwise. */
function onlyTermsEntry(version: string): LegalRegistry {
  const seeded = PRE_EPIC.find((entry) => entry.type === "terms" && entry.version === version)
  if (seeded === undefined) return withEpicEntry({ documents: [], texts: {}, published: {} }, "terms", version)
  return { documents: [seeded], texts: {}, published: { [keyOf(seeded)]: seeded.sha256 } }
}

function expectNamed(registry: LegalRegistry, key: string): void {
  const problems = legalRegistryProblems(registry)
  expect(problems.some((problem) => problem.includes(key)), problems.join("\n")).toBe(true)
}

describe("LEGAL_DOCUMENTS", () => {
  it("T10: holds exactly the ten versions seeded before this epic, newest last per type", () => {
    expect(LEGAL_DOCUMENTS.map((entry) => ({ ...entry }))).toEqual(PRE_EPIC)
    for (const entry of LEGAL_DOCUMENTS) {
      expect(entry).not.toHaveProperty("title")
      expect(entry).not.toHaveProperty("summary")
      expect(entry).not.toHaveProperty("material")
    }
    const byType = new Map<string, string[]>()
    for (const entry of LEGAL_DOCUMENTS) byType.set(entry.type, [...(byType.get(entry.type) ?? []), entry.effectiveAt])
    for (const times of byType.values()) {
      for (let i = 1; i < times.length; i++) {
        expect(Date.parse(times[i] as string)).toBeGreaterThan(Date.parse(times[i - 1] as string))
      }
    }
  })
})

describe("legal registry invariants", () => {
  it("T11: refuses two versions of a type with the same version string", () => {
    const registry = realRegistry()
    const terms = registry.documents.find((entry) => keyOf(entry) === "terms@2026-09-21")
    expect(terms).toBeDefined()
    expectNamed({ ...registry, documents: [...registry.documents, { ...(terms as LegalDocumentVersion) }] }, "terms@2026-09-21")
  })

  it("T12: takes YYYY-MM-DD and YYYY-MM-DD-<n> from 2, refuses every other version string", () => {
    for (const version of ["2026-09-06", "2026-09-06-2", "2026-09-06-12"]) {
      expect(legalRegistryProblems(onlyTermsEntry(version)), version).toEqual([])
    }
    for (const version of ["2026-9-6", "2026-09-06-1", "2026-09-06-a", "v1", "2026-09-06T00:00"]) {
      expectNamed(onlyTermsEntry(version), `terms@${version}`)
    }
  })

  it("T13: refuses material Cookies and Subprocessors versions, takes a material Terms version", () => {
    expectNamed(withEpicEntry(realRegistry(), "cookies", "2026-10-25", { material: true }), "cookies@2026-10-25")
    expectNamed(
      withEpicEntry(realRegistry(), "subprocessors", "2026-10-25", { material: true }),
      "subprocessors@2026-10-25",
    )
    expect(legalRegistryProblems(withEpicEntry(realRegistry(), "terms", "2026-10-25", { material: true }))).toEqual([])
  })

  it("T14: requires title, summary and material on new versions and refuses them on pre-epic ones", () => {
    const registry = realRegistry()
    const bare = {
      type: "terms" as const,
      version: "2026-10-25",
      effectiveAt: "2026-10-25T00:00:00.000Z",
      url: "https://civfix.org/legal/terms",
      sha256: "0".repeat(64),
    }
    expectNamed(
      {
        documents: [...registry.documents, bare],
        texts: { ...registry.texts, [keyOf(bare)]: BLOCKS },
        published: { ...registry.published, [keyOf(bare)]: bare.sha256 },
      },
      "terms@2026-10-25",
    )

    const titled = withEpicEntry(realRegistry(), "terms", "2026-10-25")
    expectNamed(
      {
        ...titled,
        documents: titled.documents.map((entry) => {
          if (keyOf(entry) !== "terms@2026-10-25") return entry
          const { summary: _summary, ...rest } = entry
          return rest
        }),
      },
      "terms@2026-10-25",
    )

    expectNamed(
      {
        ...registry,
        documents: registry.documents.map((entry) =>
          keyOf(entry) === "privacy@2026-09-16" ? { ...entry, title: "Privacy" } : entry,
        ),
      },
      "privacy@2026-09-16",
    )
  })

  it("T15: ties every text to a new version with valid blocks and a recomputed hash", () => {
    expect(LEGAL_TEXTS).toEqual({})
    expect(legalRegistryProblems(realRegistry())).toEqual([])

    const epic = withEpicEntry(realRegistry(), "terms", "2026-10-25")
    expect(legalRegistryProblems(epic)).toEqual([])
    const { ["terms@2026-10-25"]: _dropped, ...textsWithout } = epic.texts
    expectNamed({ ...epic, texts: textsWithout }, "terms@2026-10-25")

    expectNamed({ ...epic, texts: { ...epic.texts, "privacy@2026-10-25": BLOCKS } }, "privacy@2026-10-25")

    expectNamed({ ...epic, texts: { ...epic.texts, "cookies@2026-09-16": BLOCKS } }, "cookies@2026-09-16")

    expectNamed({ ...epic, texts: { ...epic.texts, "terms@2026-10-25": [] } }, "terms@2026-10-25")
    expectNamed(
      { ...epic, texts: { ...epic.texts, "terms@2026-10-25": [{ kind: "paragraph", text: "<b>x</b>" }] } },
      "terms@2026-10-25",
    )

    expectNamed(
      {
        ...epic,
        texts: { ...epic.texts, "terms@2026-10-25": [{ kind: "paragraph", text: "Hello" }] },
      },
      "terms@2026-10-25",
    )
    const wrong = "a".repeat(64)
    expectNamed(
      {
        documents: epic.documents.map((entry) => (keyOf(entry) === "terms@2026-10-25" ? { ...entry, sha256: wrong } : entry)),
        texts: epic.texts,
        published: { ...epic.published, "terms@2026-10-25": wrong },
      },
      "terms@2026-10-25",
    )
  })

  it("T16: holds every published hash fixed against the snapshot", () => {
    expect(PUBLISHED).toEqual(Object.fromEntries(PRE_EPIC.map((entry) => [keyOf(entry), entry.sha256])))
    expect(legalRegistryProblems(realRegistry())).toEqual([])

    const registry = realRegistry()
    expectNamed(
      {
        ...registry,
        documents: registry.documents.map((entry) =>
          keyOf(entry) === "cookies@2026-09-06" ? { ...entry, sha256: "f".repeat(64) } : entry,
        ),
      },
      "cookies@2026-09-06",
    )

    expectNamed(
      { ...registry, documents: registry.documents.filter((entry) => keyOf(entry) !== "subprocessors@2026-09-06") },
      "subprocessors@2026-09-06",
    )

    const epic = withEpicEntry(realRegistry(), "privacy", "2026-10-25")
    const { ["privacy@2026-10-25"]: _unpublished, ...published } = epic.published
    expectNamed({ ...epic, published }, "privacy@2026-10-25")
  })
})
