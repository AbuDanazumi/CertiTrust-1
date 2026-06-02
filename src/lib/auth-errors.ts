export function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Invalid email or password";
  if (/already registered/i.test(message)) return "An account with that email already exists";
  if (/password.*at least/i.test(message)) return "Password must be at least 6 characters";
  return message;
}
