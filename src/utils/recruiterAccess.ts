const RECRUITER_EMAIL_PATTERN = /^[^@\s]+@chryselys\.com$/i;

export function isAllowedRecruiterEmail(email: string, allowedEmails: string[]): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (!RECRUITER_EMAIL_PATTERN.test(normalizedEmail)) {
    return false;
  }

  return allowedEmails.some((allowedEmail) => allowedEmail.trim().toLowerCase() === normalizedEmail);
}