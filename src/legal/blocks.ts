import { z } from "zod"
import { MARKDOWN_SUBSET_MAX_CHARS, parseMarkdownInline, parseMarkdownSubset } from "../markdown/parse.js"

// The renderer parses inline text leniently: an unsafe link shows as its label, `![` and HTML show as
// literal text, a line break joins the lines and control characters are dropped. Legal text is shown
// exactly as hashed, so the schema refuses everything the renderer would quietly change.
const LINE_BREAK = /[\r\n]/u
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHAR = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u
const HTML = /<[A-Za-z!/?]/u
const IMAGE = /(?:^|[^\\])!\[/u

function inlineTextProblem(text: string): string | null {
  if (text.trim().length === 0) return "is blank"
  if (LINE_BREAK.test(text)) return "spans more than one line"
  if (CONTROL_CHAR.test(text)) return "contains a control character"
  if (HTML.test(text)) return "contains HTML"
  if (IMAGE.test(text)) return "contains an image"
  const nodes = parseMarkdownSubset(text)
  if (nodes.length !== 1 || nodes[0]?.type !== "paragraph") return "does not read as one paragraph"
  if (parseMarkdownInline(text).unsafeHrefs.length > 0) return "links to something other than a safe https URL"
  return null
}

const LegalInlineTextSchema = z
  .string()
  .max(MARKDOWN_SUBSET_MAX_CHARS)
  .superRefine((text, ctx) => {
    const problem = inlineTextProblem(text)
    if (problem !== null) ctx.addIssue({ code: "custom", message: `Inline text ${problem}` })
  })

const LegalBlockObjectSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("heading"),
      level: z.union([z.literal(2), z.literal(3)]),
      text: LegalInlineTextSchema,
    })
    .strict(),
  z.object({ kind: z.literal("paragraph"), text: LegalInlineTextSchema }).strict(),
  z
    .object({
      kind: z.literal("list"),
      ordered: z.boolean(),
      items: z.array(LegalInlineTextSchema).min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("table"),
      columns: z.array(LegalInlineTextSchema).min(1),
      rows: z.array(z.array(LegalInlineTextSchema)).min(1),
    })
    .strict()
    .superRefine((table, ctx) => {
      table.rows.forEach((row, index) => {
        if (row.length !== table.columns.length) {
          ctx.addIssue({
            code: "custom",
            path: ["rows", index],
            message: `Row has ${row.length} cells for ${table.columns.length} columns`,
          })
        }
      })
    }),
])
export type LegalBlock = z.infer<typeof LegalBlockObjectSchema>
export const LegalBlockSchema: z.ZodType<LegalBlock, unknown> = LegalBlockObjectSchema
