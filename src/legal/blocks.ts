import { z } from "zod"

export type LegalBlock =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; columns: string[]; rows: string[][] }

export const LegalBlockSchema: z.ZodType<LegalBlock, unknown> = z.custom<LegalBlock>(() => {
  throw new Error("not implemented")
})
