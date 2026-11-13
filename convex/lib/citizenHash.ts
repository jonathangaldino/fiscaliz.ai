/**
 * HMAC-SHA256 of a citizen identifier (phone number or simulator session).
 * A plain hash would not do: phone numbers have little entropy and could be
 * brute-forced back. Uses Web Crypto, available in the Convex runtime.
 */
export async function hashCitizenId(
  channel: string,
  externalId: string,
): Promise<string> {
  const secret = process.env.CITIZEN_HASH_SECRET;
  if (!secret) throw new Error("CITIZEN_HASH_SECRET is not set");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${channel}:${externalId}`),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
