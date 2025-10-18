import { profileSchema } from "../schemas/profilesLink";

export const validateProfileLinks = (profiles: {
  linkedin?: string;
  github?: string;
}): string | null => {
  if (!profiles.github?.trim() && !profiles.linkedin?.trim()) {
    return "Invalid Url format";
  }
  const result = profileSchema.safeParse(profiles);

  if (!result.success) {
    return result.error.issues[0].message;
  }

  return null;
};
