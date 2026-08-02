import { safeStorage } from 'electron';

export class ApiKeySecurityService {
  private static sessionKeys: Map<string, string> = new Map();

  public static isSafeStorageAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  public static setSessionKey(providerId: string, apiKey: string): void {
    if (!apiKey) {
      this.sessionKeys.delete(providerId);
    } else {
      this.sessionKeys.set(providerId, apiKey.trim());
    }
  }

  public static getSessionKey(providerId: string): string | null {
    return this.sessionKeys.get(providerId) || null;
  }

  public static encryptApiKey(plainKey: string): string | null {
    if (!plainKey || plainKey.trim() === '') return null;
    const trimmed = plainKey.trim();

    if (this.isSafeStorageAvailable()) {
      try {
        const buffer = safeStorage.encryptString(trimmed);
        return 'enc:' + buffer.toString('hex');
      } catch (err) {
        console.error('[ApiKeySecurityService] Error encrypting API key with safeStorage:', err);
        return null;
      }
    }

    return null;
  }

  public static decryptApiKey(storedValue?: string | null): string | null {
    if (!storedValue) return null;

    if (storedValue.startsWith('enc:')) {
      if (this.isSafeStorageAvailable()) {
        try {
          const hex = storedValue.substring(4);
          const buffer = Buffer.from(hex, 'hex');
          return safeStorage.decryptString(buffer);
        } catch (err) {
          console.error('[ApiKeySecurityService] Failed to decrypt safeStorage API key:', err);
          return null;
        }
      } else {
        console.warn('[ApiKeySecurityService] safeStorage is unavailable on host OS. Cannot decrypt encrypted key.');
        return null;
      }
    }

    if (storedValue.startsWith('unencrypted:')) {
      return storedValue.substring(12);
    }

    return storedValue;
  }
}
