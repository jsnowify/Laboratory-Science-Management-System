export function trustedMutationOrigin(
  headers: {
    origin?: string;
    cookie?: string;
    "sec-fetch-site"?: string;
  },
  frontendUrl: string,
) {
  if (headers["sec-fetch-site"] === "cross-site") return false;
  if (headers.origin) return headers.origin === new URL(frontendUrl).origin;
  return !headers.cookie;
}
