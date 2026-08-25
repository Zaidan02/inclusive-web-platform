// Keep the onboarding requirement centralized: this rule may expand as the profile grows.
export const isCandidateProfileComplete = (profile) =>
  Array.isArray(profile?.selectedDisabilities) &&
  profile.selectedDisabilities.length > 0 &&
  Boolean(profile?.educationLevel) &&
  Boolean(profile?.readingAbility) &&
  Boolean(profile?.writingAbility) &&
  Boolean(profile?.numeracyAbility) &&
  Boolean(profile?.firstName) &&
  Boolean(profile?.lastName) &&
  Boolean(profile?.location);
