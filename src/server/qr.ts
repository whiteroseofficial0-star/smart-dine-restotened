/** The URL encoded in a table's QR code. PUBLIC_BASE_URL should be a LAN IP / domain that phones can reach. */
export const menuUrl = (token: string, fallbackOrigin: string) => `${(process.env.PUBLIC_BASE_URL || fallbackOrigin).replace(/\/$/, "")}/t/${token}`;
