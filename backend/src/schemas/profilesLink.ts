import z from "zod";

export const profileSchema = z.object({
  linkedin: z.url().optional(),
  github: z.url().optional(),
});
