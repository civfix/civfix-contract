import { describe, expect, it } from "vitest"
import * as units from "../src/time-units.js"

describe("time units", () => {
  it("holds the backend's values", () => {
    expect({ ...units }).toEqual({
      MS_PER_SECOND: 1000,
      SECONDS_PER_MINUTE: 60,
      MINUTES_PER_HOUR: 60,
      SECONDS_PER_HOUR: 3600,
      SECONDS_PER_DAY: 86_400,
      MS_PER_MINUTE: 60_000,
      MS_PER_HOUR: 3_600_000,
      MS_PER_DAY: 86_400_000,
      MS_PER_WEEK: 604_800_000,
    })
  })
})
