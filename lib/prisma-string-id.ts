import { z } from "zod";

/** Prisma `String @id` values: UUIDs, seed ids (e.g. `"1"`), slug-as-id, etc. */
export const prismaStringIdSchema = z.string().trim().min(1).max(200);

export function prismaStringIdArraySchema(maxItems: number) {
  return z.array(prismaStringIdSchema).min(1).max(maxItems);
}
