export type PortalType = "institution" | "organization";

export function loginPath(portal: PortalType) {
  return portal === "institution" ? "/login/institution" : "/login/organization";
}

export function signupPath(portal: PortalType) {
  return portal === "institution" ? "/signup/institution" : "/signup/organization";
}

/** Where to send unauthenticated users leaving a portal shell. */
export function loginPathForPortalShell(portal: PortalType) {
  return loginPath(portal);
}
