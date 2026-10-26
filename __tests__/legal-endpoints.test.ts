import { describe, expect, it } from "vitest"
import { endpoints } from "../src/client/endpoints.js"
import {
  AcceptLegalRequestSchema,
  AcceptLegalResponseSchema,
  GetLegalDocumentRequestSchema,
} from "../src/schemas/legal.js"

describe("legal endpoints", () => {
  it("T31: registers the four legal endpoints", () => {
    const shape = (name: string) => {
      const e = (endpoints as Record<string, { method: string; path: string; auth: string; csrf: boolean; version: string }>)[name]
      return e === undefined ? undefined : { method: e.method, path: e.path, auth: e.auth, csrf: e.csrf, version: e.version }
    }
    expect(shape("getLegalDocuments")).toEqual({
      method: "GET",
      path: "/legal/documents",
      auth: "public",
      csrf: false,
      version: "v1",
    })
    expect(shape("getLegalDocument")).toEqual({
      method: "GET",
      path: "/legal/documents/:type/:version",
      auth: "public",
      csrf: false,
      version: "v1",
    })
    expect(shape("getMyLegalStatus")).toEqual({
      method: "GET",
      path: "/me/legal",
      auth: "required",
      csrf: false,
      version: "v1",
    })
    expect(shape("acceptLegal")).toEqual({
      method: "POST",
      path: "/me/legal/accept",
      auth: "required",
      csrf: true,
      version: "v1",
    })
    const registry = endpoints as Record<string, { request: unknown; response: unknown }>
    expect(registry.getLegalDocument?.request).toBe(GetLegalDocumentRequestSchema)
    expect(registry.acceptLegal?.request).toBe(AcceptLegalRequestSchema)
    expect(registry.acceptLegal?.response).toBe(AcceptLegalResponseSchema)
    expect(Object.keys(endpoints)).not.toContain("getAppConfig")
    expect(Object.keys(endpoints)).toHaveLength(345)
    expect(Object.values(endpoints).filter((e) => e.path.startsWith("/admin"))).toHaveLength(109)
  })
})
