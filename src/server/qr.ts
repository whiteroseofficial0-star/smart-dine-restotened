/** The URL encoded in a table's QR code. PUBLIC_BASE_URL should be a LAN IP / domain that phones can reach. */
export const menuUrl = (token: string, fallbackOrigin: string) => {
  const raw = (process.env.PUBLIC_BASE_URL || fallbackOrigin).trim().replace(/\/$/, "");
  // Allow a bare host from the platform (e.g. "my-app.onrender.com") and default to https in production.
  const base = /^https?:\/\//i.test(raw) ? raw : `${process.env.NODE_ENV === "production" ? "https" : "http"}://${raw}`;
  return `${base}/t/${token}`;
};
