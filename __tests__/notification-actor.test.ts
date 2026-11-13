import { describe, expect, it } from "vitest"
import { ListNotificationsResponseSchema, NotificationDTOSchema } from "../src/index.js"

const ACTOR_ID = "123e4567-e89b-12d3-a456-426614174000"

const reportUpdate = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  type: "report_update",
  title: "Your report was fixed",
  read: false,
  createdAt: "2026-11-13T12:00:00.000Z",
}

const actor = {
  id: ACTOR_ID,
  name: "Maria Gonzalez",
  handle: "mariag",
  avatar: ["#aaa111", "#bbb222"],
  avatarUrl: "https://cdn.example/a.webp",
  isFollowing: true,
}

const newFollower = {
  ...reportUpdate,
  id: "123e4567-e89b-12d3-a456-426614174002",
  type: "new_follower",
  actor,
}

describe("NotificationDTO.actor", () => {
  it("T1: a notification without an actor key parses, and actor stays undefined", () => {
    const parsed = NotificationDTOSchema.safeParse(reportUpdate)
    expect(parsed.success).toBe(true)
    expect(parsed.data?.actor).toBeUndefined()
  })

  it("T2: a null actor parses as null", () => {
    const parsed = NotificationDTOSchema.safeParse({ ...reportUpdate, actor: null })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.actor).toBeNull()
  })

  it("T3: a new_follower notification keeps its whole actor", () => {
    const parsed = NotificationDTOSchema.safeParse(newFollower)
    expect(parsed.success).toBe(true)
    expect(parsed.data?.actor).toEqual(actor)
  })

  it("T4: an actor without isFollowing fails", () => {
    const parsed = NotificationDTOSchema.safeParse({
      ...reportUpdate,
      actor: { id: ACTOR_ID, name: "Maria" },
    })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues.map((i) => i.path)).toEqual([["actor", "isFollowing"]])
  })

  it("T5: an actor whose id is not a uuid fails", () => {
    const parsed = NotificationDTOSchema.safeParse({
      ...reportUpdate,
      actor: { id: "not-a-uuid", name: "Maria", isFollowing: false },
    })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues.map((i) => i.path)).toEqual([["actor", "id"]])
  })

  it("T6: a page mixing a notification without an actor and one with an actor parses", () => {
    const parsed = ListNotificationsResponseSchema.safeParse({
      items: [reportUpdate, newFollower],
      nextCursor: null,
    })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.items[0]?.actor).toBeUndefined()
    expect(parsed.data?.items[1]?.actor?.id).toBe(ACTOR_ID)
  })
})
