function optionalString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function createPublicTutorProfile(uid, profile, approved = profile?.approved === true) {
  return {
    uid,
    name: optionalString(profile?.displayName || profile?.name, 80),
    photoURL: optionalString(profile?.photoURL || profile?.avatar, 2048),
    bio: optionalString(profile?.bio, 2000),
    subject: optionalString(profile?.subject, 120),
    education: optionalString(profile?.education || profile?.qualification, 300),
    experience: optionalString(profile?.experience, 300),
    hourlyRate: optionalNumber(profile?.hourlyRate),
    rating: optionalNumber(profile?.rating),
    reviewsCount: optionalNumber(profile?.reviewsCount),
    approved: approved === true,
  }
}
