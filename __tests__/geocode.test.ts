import { describe, it, expect, vi, afterEach } from "vitest"

import {
  parseLatLng,
  photonSuggest,
  mapboxSuggest,
  suggestAddresses,
} from "../src/geocode.js"
import type { SuggestOptions } from "../src/geocode.js"

/**
 * Tests for the unified forward geocoder. parseLatLng is pure; photonSuggest, mapboxSuggest and
 * suggestAddresses are exercised against a stubbed global fetch so the coordinate short-circuit, the
 * Mapbox->Photon fallback and abort propagation are covered without hitting Photon / Mapbox.
 */

afterEach(() => {
  vi.restoreAllMocks()
})

/** A Photon FeatureCollection Response for the fetch stub. */
function photonResponse(features: Array<{ lat: number; lng: number; props?: Record<string, unknown> }>): Response {
  const body = {
    features: features.map((f) => ({
      geometry: { coordinates: [f.lng, f.lat] },
      properties: f.props ?? {},
    })),
  }
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })
}

/** A Mapbox Geocoding v6 FeatureCollection Response (raw feature shape). */
function mapboxResponse(features: unknown[]): Response {
  return new Response(JSON.stringify({ type: "FeatureCollection", features }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

describe("parseLatLng", () => {
  it("parses comma- and space-separated pairs", () => {
    expect(parseLatLng("34.0522, -118.2437")).toEqual({ lat: 34.0522, lng: -118.2437 })
    expect(parseLatLng("34.0522 -118.2437")).toEqual({ lat: 34.0522, lng: -118.2437 })
    expect(parseLatLng("  34.0522,-118.2437 ")).toEqual({ lat: 34.0522, lng: -118.2437 })
  })

  it("rejects trailing-empty, single numbers, addresses, and out-of-range", () => {
    expect(parseLatLng("34,")).toBeNull()
    expect(parseLatLng("90210")).toBeNull()
    expect(parseLatLng("123 Main St, Los Angeles")).toBeNull()
    expect(parseLatLng("1 2 3")).toBeNull()
    expect(parseLatLng("200, 20")).toBeNull()
    expect(parseLatLng("20, 200")).toBeNull()
    expect(parseLatLng("   ")).toBeNull()
  })
})

describe("photonSuggest", () => {
  it("normalizes Photon features and forwards the proximity bias", async () => {
    let calledUrl = ""
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        calledUrl = String(url)
        return photonResponse([
          { lat: 34.1184, lng: -118.3004, props: { name: "Griffith Observatory", city: "Los Angeles", state: "California" } },
        ])
      }),
    )

    const out = await photonSuggest("Griffith Observatory", { proximity: { lat: 34.05, lng: -118.24 } })
    expect(out[0]).toMatchObject({ label: "Griffith Observatory", source: "photon" })
    expect(out[0]?.secondary).toContain("Los Angeles")
    const params = new URL(calledUrl).searchParams
    expect(params.get("q")).toBe("Griffith Observatory")
    expect(params.get("lat")).toBe("34.05")
    expect(params.get("lon")).toBe("-118.24")
    expect(params.get("limit")).toBe("5")
  })

  it("forwards the proximity zoom + location bias scale when given", async () => {
    let calledUrl = ""
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        calledUrl = String(url)
        return photonResponse([])
      }),
    )

    await photonSuggest("main st", {
      proximity: { lat: 34.05, lng: -118.24 },
      proximityZoom: 15,
      locationBiasScale: 0.6,
    })
    const params = new URL(calledUrl).searchParams
    expect(params.get("zoom")).toBe("15")
    expect(params.get("location_bias_scale")).toBe("0.6")
  })

  it("omits zoom + location bias scale when not provided", async () => {
    let calledUrl = ""
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        calledUrl = String(url)
        return photonResponse([])
      }),
    )

    await photonSuggest("main st", { proximity: { lat: 34.05, lng: -118.24 } })
    const params = new URL(calledUrl).searchParams
    expect(params.has("zoom")).toBe(false)
    expect(params.has("location_bias_scale")).toBe(false)
  })

  it("does not send zoom / bias scale without a proximity point (they need a focus)", async () => {
    let calledUrl = ""
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        calledUrl = String(url)
        return photonResponse([])
      }),
    )

    await photonSuggest("main st", { proximityZoom: 15, locationBiasScale: 0.6 })
    const params = new URL(calledUrl).searchParams
    expect(params.has("lat")).toBe(false)
    expect(params.has("zoom")).toBe(false)
    expect(params.has("location_bias_scale")).toBe(false)
  })

  it("builds a street label when the feature has no name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => photonResponse([{ lat: 1, lng: 2, props: { housenumber: "123", street: "Main St", city: "Springfield" } }])),
    )
    const out = await photonSuggest("123 Main St")
    expect(out[0]?.label).toBe("123 Main St")
    expect(out[0]?.secondary).toBe("Springfield")
  })

  it("returns [] for empty input without calling the network", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    expect(await photonSuggest("   ")).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("throws on an HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 503 })))
    await expect(photonSuggest("anywhere")).rejects.toThrow()
  })

  it("skips malformed features and keeps the well-formed ones", async () => {
    const features = [
      null,
      { geometry: { coordinates: [-118.2] }, properties: { name: "One coordinate" } },
      { geometry: { coordinates: ["-118.2", "34.0"] }, properties: { name: "String coordinates" } },
      { geometry: { coordinates: [-118.2, 34.0] }, properties: { name: 42 } },
      { properties: { name: "No geometry" } },
      { geometry: { coordinates: [-118.2, 34.0, 120] }, properties: null },
    ]
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ features })))
    expect(await photonSuggest("anywhere")).toEqual([
      { id: "photon:34,-118.2", label: "Unknown place", secondary: undefined, lat: 34, lng: -118.2, source: "photon" },
    ])
  })

  it("resolves no suggestions for a body that is not a feature collection", async () => {
    for (const body of [null, [], {}, { features: "none" }, "text"]) {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body)))
      expect(await photonSuggest("anywhere")).toEqual([])
    }
  })
})

describe("mapboxSuggest", () => {
  it("throws without a token", async () => {
    await expect(mapboxSuggest("main st", {})).rejects.toThrow()
  })

  it("normalizes v6 features and forwards proximity + autocomplete + country params", async () => {
    let calledUrl = ""
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        calledUrl = String(url)
        return mapboxResponse([
          {
            geometry: { coordinates: [-118.24, 34.05] },
            properties: {
              name: "123 Main Street",
              place_formatted: "Los Angeles, California 90012, United States",
              context: { place: { name: "Los Angeles" }, region: { region_code: "CA" } },
            },
          },
        ])
      }),
    )
    const out = await mapboxSuggest("123 main st", {
      mapboxToken: "pk.test",
      proximity: { lat: 34.05, lng: -118.24 },
      limit: 6,
    })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      label: "123 Main Street",
      secondary: "Los Angeles, California 90012, United States",
      lat: 34.05,
      lng: -118.24,
      source: "mapbox",
    })
    const params = new URL(calledUrl).searchParams
    expect(params.get("q")).toBe("123 main st")
    expect(params.get("access_token")).toBe("pk.test")
    expect(params.get("autocomplete")).toBe("true")
    expect(params.get("country")).toBe("us")
    expect(params.get("limit")).toBe("6")
    expect(params.get("proximity")).toBe("-118.24,34.05")
  })

  it("throws on HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 401 })))
    await expect(mapboxSuggest("x", { mapboxToken: "pk.test" })).rejects.toThrow()
  })

  it("skips malformed features and resolves none for a body that is not a feature collection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mapboxResponse([
          { geometry: { coordinates: [-118.2] }, properties: { name: "One coordinate" } },
          { geometry: { coordinates: [-118.2, 34.0] }, properties: { context: { place: "Los Angeles" } } },
          { geometry: { coordinates: [-118.25, 34.05] }, properties: { name: "Main St", context: null } },
        ]),
      ),
    )
    const out = await mapboxSuggest("main st", { mapboxToken: "pk.test" })
    expect(out.map((s) => s.label)).toEqual(["Main St"])

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ type: "FeatureCollection" })))
    expect(await mapboxSuggest("main st", { mapboxToken: "pk.test" })).toEqual([])
  })

  it("returns [] for blank input without calling the network", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    expect(await mapboxSuggest("  ", { mapboxToken: "pk.test" })).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("suggestAddresses", () => {
  it("short-circuits a coordinate paste with no network", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const out = await suggestAddresses("34.05, -118.24", { mapboxToken: "pk.test" })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ source: "coordinate", lat: 34.05, lng: -118.24 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("uses Photon when no mapbox token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => photonResponse([{ lat: 34.0, lng: -118.2, props: { name: "Echo Park" } }])),
    )
    const out = await suggestAddresses("echo park", {})
    expect(out[0]?.source).toBe("photon")
  })

  it("uses Mapbox when a token is set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mapboxResponse([{ geometry: { coordinates: [-118.2, 34.0] }, properties: { name: "Echo Park" } }]),
      ),
    )
    const out = await suggestAddresses("echo park", { mapboxToken: "pk.test" })
    expect(out[0]?.source).toBe("mapbox")
  })

  it("falls back to Photon when Mapbox throws (HTTP error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) =>
        String(url).includes("mapbox.com")
          ? new Response("err", { status: 500 })
          : photonResponse([{ lat: 34.0, lng: -118.2, props: { name: "Echo Park" } }]),
      ),
    )
    const out = await suggestAddresses("echo park", { mapboxToken: "pk.test" })
    expect(out[0]?.source).toBe("photon")
  })

  it("falls back to Photon when Mapbox returns empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) =>
        String(url).includes("mapbox.com")
          ? mapboxResponse([])
          : photonResponse([{ lat: 34.0, lng: -118.2, props: { name: "Echo Park" } }]),
      ),
    )
    const out = await suggestAddresses("echo park", { mapboxToken: "pk.test" })
    expect(out[0]?.source).toBe("photon")
  })

  // An aborted (stale) keystroke must not RESOLVE [] and clobber the newer query's results.
  it("rejects instead of resolving [] when the caller aborts the Photon call", async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        controller.abort()
        throw Object.assign(new Error("aborted"), { name: "AbortError" })
      }),
    )
    await expect(suggestAddresses("echo", { signal: controller.signal })).rejects.toThrow()
  })

  it("rejects on an aborted Mapbox call instead of firing a fresh Photon request", async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn(async () => {
      controller.abort()
      throw Object.assign(new Error("aborted"), { name: "AbortError" })
    })
    vi.stubGlobal("fetch", fetchMock)
    await expect(
      suggestAddresses("echo", { mapboxToken: "pk.test", signal: controller.signal }),
    ).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

type OnError = NonNullable<SuggestOptions["onError"]>

describe("suggestAddresses onError", () => {
  it("reports a Photon outage while still resolving []", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })))
    const onError = vi.fn<OnError>()
    await expect(suggestAddresses("echo park", { onError })).resolves.toEqual([])
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]?.[1]).toBe("photon")
    expect(String(onError.mock.calls[0]?.[0])).toContain("503")
  })

  it("reports a Mapbox failure it falls back past, then the Photon result wins", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) =>
        String(url).includes("mapbox.com")
          ? new Response("err", { status: 500 })
          : photonResponse([{ lat: 34.0, lng: -118.2, props: { name: "Echo Park" } }]),
      ),
    )
    const onError = vi.fn<OnError>()
    const out = await suggestAddresses("echo park", { mapboxToken: "pk.test", onError })
    expect(out[0]?.source).toBe("photon")
    expect(onError.mock.calls.map((call) => call[1])).toEqual(["mapbox"])
  })

  it("is not called for the caller's own abort", async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        controller.abort()
        throw Object.assign(new Error("aborted"), { name: "AbortError" })
      }),
    )
    const onError = vi.fn<OnError>()
    await expect(suggestAddresses("echo", { signal: controller.signal, onError })).rejects.toThrow()
    expect(onError).not.toHaveBeenCalled()
  })
})

describe("suggestion language/country options", () => {
  it("forwards a supported language to Photon and falls back to English for the rest", async () => {
    const urls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        urls.push(String(url))
        return photonResponse([])
      }),
    )
    await photonSuggest("x", { language: "de-DE" })
    await photonSuggest("x", { language: "ko" })
    expect(new URL(urls[0]!).searchParams.get("lang")).toBe("de")
    expect(new URL(urls[1]!).searchParams.get("lang")).toBe("en")
  })

  it("forwards language to Mapbox and drops the country filter when country is null", async () => {
    const urls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        urls.push(String(url))
        return mapboxResponse([])
      }),
    )
    await mapboxSuggest("x", { mapboxToken: "pk.test", language: "es" })
    await mapboxSuggest("x", { mapboxToken: "pk.test", country: null })
    const first = new URL(urls[0]!).searchParams
    expect(first.get("language")).toBe("es")
    expect(first.get("country")).toBe("us")
    expect(new URL(urls[1]!).searchParams.get("country")).toBeNull()
  })
})
