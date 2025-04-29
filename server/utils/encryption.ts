// server/utils/encryption.ts
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config(); // Ensure environment variables are loaded

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16; // Standard for GCM

if (!KEY_HEX || KEY_HEX.length !== 64) {
  throw new Error(
    'Invalid ENCRYPTION_KEY in .env. Must be a 64-character hex string (32 bytes).',
  );
}

const key = Buffer.from(KEY_HEX, 'hex');

/**
 * Encrypts plaintext using AES-256-GCM.
 * Prepends IV and appends Auth Tag to the ciphertext.
 * @param text The plaintext string to encrypt.
 * @returns A string in the format "iv:encrypted:authTag" (hex encoded), or null if input is null/undefined.
 */
export function encrypt(text: string | null | undefined): string | null {
  if (text == null) {
    // Handle null or undefined input gracefully
    return null;
  }
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    // Using ':' as a separator, ensure your actual data doesn't contain this sequence if using hex
    return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    // Depending on your error handling strategy, you might throw,
    // return null, or return the original text. Throwing is often safer.
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts ciphertext encrypted with AES-256-GCM.
 * Expects input format "iv:encrypted:authTag" (hex encoded).
 * @param encryptedText The combined IV, ciphertext, and auth tag string.
 * @returns The original plaintext string, or null if input is null/invalid format.
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (encryptedText == null) {
    return null;
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      console.error(
        'Decryption failed: Invalid format. Expected "iv:encrypted:authTag". Received:',
        encryptedText,
      );
      // Return null or throw, depending on how you want to handle malformed data
      return null; // Or potentially return the input string if it wasn't encrypted
    }

    const [ivHex, encryptedHex, tagHex] = parts;

    if (
      !ivHex ||
      !encryptedHex ||
      !tagHex ||
      ivHex.length !== IV_LENGTH * 2 || // hex is 2 chars per byte
      tagHex.length !== AUTH_TAG_LENGTH * 2
    ) {
      console.error(
        'Decryption failed: Invalid component lengths or missing parts.',
      );
      return null;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    // Catch specific errors like 'Unsupported state or unable to authenticate data'
    if (error.message.includes('authenticate data')) {
      console.error(
        'Decryption failed: Data integrity check failed (tampered or wrong key?).',
      );
    } else {
      console.error('Decryption failed:', error);
    }
    // Return null on any decryption error to avoid exposing potentially corrupted data
    return null;
  }
}
