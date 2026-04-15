import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

/** AES-256-GCM encryption for stored ad-account passwords. */
@Injectable()
export class CredentialsCryptoService {
  private readonly key: Buffer;

  constructor() {
    const explicit = process.env.CREDENTIALS_ENCRYPTION_KEY;
    if (explicit) {
      const b = Buffer.from(explicit, 'base64');
      if (b.length !== 32) {
        throw new Error(
          'CREDENTIALS_ENCRYPTION_KEY must be base64 encoding of exactly 32 bytes',
        );
      }
      this.key = b;
      return;
    }
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error(
        'Set CREDENTIALS_ENCRYPTION_KEY (32-byte base64) or JWT_ACCESS_SECRET for credential encryption',
      );
    }
    this.key = createHash('sha256')
      .update(`${secret}|datamemo|credentials|v1`)
      .digest();
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  decrypt(blob: string): string {
    const raw = Buffer.from(blob, 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }
}
