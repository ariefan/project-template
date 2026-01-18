import crypto from "node:crypto";

/**
 * Encrypt a buffer using AES-256-GCM
 */
export function encryptBuffer(
  data: Buffer,
  password: string
): { encrypted: Buffer; iv: string; authTag: string } {
  // Derive key from password using scrypt
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Prepend salt to IV for storage (needed for decryption)
  const ivWithSalt = Buffer.concat([salt, iv]);

  return {
    encrypted,
    iv: ivWithSalt.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * Decrypt a buffer using AES-256-GCM
 */
export function decryptBuffer(
  encrypted: Buffer,
  password: string,
  ivWithSaltBase64: string,
  authTagBase64: string
): Buffer {
  const ivWithSalt = Buffer.from(ivWithSaltBase64, "base64");
  const salt = ivWithSalt.subarray(0, 16);
  const iv = ivWithSalt.subarray(16);
  const authTag = Buffer.from(authTagBase64, "base64");

  const key = crypto.scryptSync(password, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
