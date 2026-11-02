/**
 * Hash a 4-digit App PIN using SHA-256 for secure local/cloud storage
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`BHARAT_MANDI_SALT_${pin}_PIN`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify if entered pin matches stored hash
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  const hash = await hashPin(pin);
  return hash === storedHash;
}
