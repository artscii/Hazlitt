// v4.13.1: fixed public origin avoids trusting arbitrary forwarded headers.
export function requestOrigin(host, configured = "") {
  if (configured) {
    const publicURL = new URL(configured);
    if (
      publicURL.protocol !== "https:" ||
      publicURL.username ||
      publicURL.password ||
      publicURL.pathname !== "/" ||
      publicURL.search ||
      publicURL.hash
    )
      throw Error("PUBLIC_ORIGIN must be an HTTPS origin");
    if (host === publicURL.host) return publicURL.origin;
  }
  const local = new URL("http://" + host);
  if (
    configured &&
    !["localhost", "127.0.0.1", "[::1]"].includes(local.hostname)
  )
    throw Error("Unexpected host");
  return local.origin;
}
