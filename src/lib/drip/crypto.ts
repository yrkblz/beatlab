import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM encryption for sender secrets (Google App Password / refresh token).
 * Key derived from DRIP_ENCRYPTION_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY.
 */
function getKey(): Buffer {
  const material = process.env.DRIP_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!material) {
    throw new Error('Brak klucza szyfrowania (ustaw DRIP_ENCRYPTION_KEY lub SUPABASE_SERVICE_ROLE_KEY).');
  }
  return createHash('sha256').update(material).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':');
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = (payload || '').split(':');
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Nieprawidłowy format zaszyfrowanego sekretu.');
  }
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
