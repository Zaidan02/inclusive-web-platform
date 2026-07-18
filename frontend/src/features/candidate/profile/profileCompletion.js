// Keep the onboarding requirement centralized: this rule may expand as the profile grows.
export const isCandidateProfileComplete = (profile) =>
  Array.isArray(profile?.selectedDisabilities) &&
  profile.selectedDisabilities.length > 0;
