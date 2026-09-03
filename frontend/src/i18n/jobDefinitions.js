export function localizeJobDefinition(t, definition) {
  const slug = definition?.slug || definition?.jobDefinitionSlug || definition?.jobDefinition?.slug;
  const fallback = definition?.name || definition?.job_title || definition?.title || "";

  if (!slug) return fallback;

  return t(`profile:jobDefinitions.${slug}`, { defaultValue: fallback });
}
