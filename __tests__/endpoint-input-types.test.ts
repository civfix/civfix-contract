import { describe, expectTypeOf, it } from "vitest"
import type { z } from "zod"
import type { endpoints } from "../src/client/endpoints.js"
import type {
  OrganizationRefDTO,
  OrganizationRefDTOInput,
  OrganizationRefDTOSchema,
} from "../src/index.js"

type Endpoints = typeof endpoints

type UnknownResponseInput = {
  [K in keyof Endpoints]: unknown extends z.input<Endpoints[K]["response"]> ? K : never
}[keyof Endpoints]

// `request: null` marks an endpoint without a request body, and `z.input<null>` is `unknown`, so those
// endpoints are left out here the way `RequestOf` leaves them out.
type UnknownRequestInput = {
  [K in keyof Endpoints]: Endpoints[K]["request"] extends z.ZodType
    ? unknown extends z.input<Endpoints[K]["request"]>
      ? K
      : never
    : never
}[keyof Endpoints]

// Checked by `tsc --noEmit` (pnpm typecheck), not at runtime: an `unknown` input means the backend's
// `EndpointReply<N>` checks nothing about what that handler sends.
describe("endpoint schema input types", () => {
  it("T1: no endpoint's response input is unknown", () => {
    expectTypeOf<UnknownResponseInput>().toEqualTypeOf<never>()
  })

  it("T2: no endpoint's request input is unknown", () => {
    expectTypeOf<UnknownRequestInput>().toEqualTypeOf<never>()
  })

  it("T3: OrganizationRefDTOInput from the package root is the schema's input type", () => {
    expectTypeOf<OrganizationRefDTOInput>().toEqualTypeOf<
      z.input<typeof OrganizationRefDTOSchema>
    >()
    expectTypeOf<z.infer<typeof OrganizationRefDTOSchema>>().toEqualTypeOf<OrganizationRefDTO>()
  })
})
