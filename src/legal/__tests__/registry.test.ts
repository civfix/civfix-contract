import { describe, expect, it } from "vitest"
import { LEGAL_TEXTS, legalRecordSha256 } from "../../legal-texts/index.js"
import type { LegalDocumentType } from "../../schemas/common.js"
import type { LegalBlock } from "../blocks.js"
import { LEGAL_DOCUMENTS, type LegalDocumentVersion } from "../documents.js"
import { PRE_EPIC } from "./pre-epic.js"
import PUBLISHED from "./published-hashes.json"
import { legalRegistryProblems, type LegalRegistry } from "./registry-invariants.js"

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
    effectiveAt: "2026-11-01T00:00:00.000Z",
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
  it("T10: keeps every version newest last per type", () => {
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
    expectNamed(withEpicEntry(realRegistry(), "cookies", "2026-11-01", { material: true }), "cookies@2026-11-01")
    expectNamed(
      withEpicEntry(realRegistry(), "subprocessors", "2026-11-01", { material: true }),
      "subprocessors@2026-11-01",
    )
    expect(legalRegistryProblems(withEpicEntry(realRegistry(), "terms", "2026-11-01", { material: true }))).toEqual([])
  })

  it("T14: requires title, summary and material on new versions and refuses them on pre-epic ones", () => {
    const registry = realRegistry()
    const bare = {
      type: "terms" as const,
      version: "2026-11-01",
      effectiveAt: "2026-11-01T00:00:00.000Z",
      url: "https://civfix.org/legal/terms",
      sha256: "0".repeat(64),
    }
    expectNamed(
      {
        documents: [...registry.documents, bare],
        texts: { ...registry.texts, [keyOf(bare)]: BLOCKS },
        published: { ...registry.published, [keyOf(bare)]: bare.sha256 },
      },
      "terms@2026-11-01",
    )

    const titled = withEpicEntry(realRegistry(), "terms", "2026-11-01")
    expectNamed(
      {
        ...titled,
        documents: titled.documents.map((entry) => {
          if (keyOf(entry) !== "terms@2026-11-01") return entry
          const { summary: _summary, ...rest } = entry
          return rest
        }),
      },
      "terms@2026-11-01",
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
    expect(legalRegistryProblems(realRegistry())).toEqual([])

    const epic = withEpicEntry(realRegistry(), "terms", "2026-11-01")
    expect(legalRegistryProblems(epic)).toEqual([])
    const { ["terms@2026-11-01"]: _dropped, ...textsWithout } = epic.texts
    expectNamed({ ...epic, texts: textsWithout }, "terms@2026-11-01")

    expectNamed({ ...epic, texts: { ...epic.texts, "privacy@2026-11-01": BLOCKS } }, "privacy@2026-11-01")

    expectNamed({ ...epic, texts: { ...epic.texts, "cookies@2026-09-16": BLOCKS } }, "cookies@2026-09-16")

    expectNamed({ ...epic, texts: { ...epic.texts, "terms@2026-11-01": [] } }, "terms@2026-11-01")
    expectNamed(
      { ...epic, texts: { ...epic.texts, "terms@2026-11-01": [{ kind: "paragraph", text: "<b>x</b>" }] } },
      "terms@2026-11-01",
    )

    expectNamed(
      {
        ...epic,
        texts: { ...epic.texts, "terms@2026-11-01": [{ kind: "paragraph", text: "Hello" }] },
      },
      "terms@2026-11-01",
    )
    const wrong = "a".repeat(64)
    expectNamed(
      {
        documents: epic.documents.map((entry) => (keyOf(entry) === "terms@2026-11-01" ? { ...entry, sha256: wrong } : entry)),
        texts: epic.texts,
        published: { ...epic.published, "terms@2026-11-01": wrong },
      },
      "terms@2026-11-01",
    )
  })

  it("T16: holds every published hash fixed against the snapshot", () => {
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

    const epic = withEpicEntry(realRegistry(), "privacy", "2026-11-01")
    const { ["privacy@2026-11-01"]: _unpublished, ...published } = epic.published
    expectNamed({ ...epic, published }, "privacy@2026-11-01")
  })
})
