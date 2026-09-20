/**
 * Extensible User Account & Email Recipient Service
 *
 * Architecture Note:
 * This module provides an abstraction layer for resolving the current user's
 * identity and email address. Currently, the user manually enters their email
 * in the UI, but this service is architected to seamlessly hook into future
 * user account systems (e.g., Shopify App Bridge session tokens, Firebase Auth,
 * Google OAuth, or a custom merchant session store).
 */

export interface UserAccount {
  id: string;
  email: string;
  name?: string;
  storeDomain?: string;
  role?: 'merchant_owner' | 'developer' | 'auditor' | 'guest';
  isAuthenticated: boolean;
  linkedAt?: string;
}

export interface EmailRecipientResolver {
  /**
   * Retrieves the currently authenticated or linked user account if available.
   */
  getUserAccount(): Promise<UserAccount | null>;

  /**
   * Resolves the default email recipient for recaps and notifications.
   * Returns null if no account is currently linked, prompting manual user input.
   */
  resolveDefaultRecipient(): Promise<string | null>;

  /**
   * Links or caches a user email (e.g. for session continuity).
   */
  linkUserEmail(email: string, name?: string): Promise<UserAccount>;

  /**
   * Clears any active user session or cached email.
   */
  clearUserSession(): Promise<void>;
}

const LOCAL_STORAGE_ACCOUNT_KEY = 'shopify_revenue_auditor_user_account';

class DefaultEmailRecipientProvider implements EmailRecipientResolver {
  private inMemoryAccount: UserAccount | null = null;

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
      if (stored) {
        this.inMemoryAccount = JSON.parse(stored);
      }
    } catch {
      this.inMemoryAccount = null;
    }
  }

  public async getUserAccount(): Promise<UserAccount | null> {
    // 1. Check in-memory / hydrated account
    if (this.inMemoryAccount) {
      return this.inMemoryAccount;
    }

    // 2. Extensibility hook: Inspect global Shopify App Bridge or platform context if available
    // Example: window.shopify?.config?.shopOrigin or user session tokens
    const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
    if (win.__USER_ACCOUNT__ && typeof win.__USER_ACCOUNT__ === 'object') {
      return win.__USER_ACCOUNT__ as UserAccount;
    }

    return null;
  }

  public async resolveDefaultRecipient(): Promise<string | null> {
    const account = await this.getUserAccount();
    return account?.email || null;
  }

  public async linkUserEmail(email: string, name?: string): Promise<UserAccount> {
    const account: UserAccount = {
      id: `usr_${Date.now()}`,
      email: email.trim(),
      name: name?.trim() || undefined,
      isAuthenticated: true,
      linkedAt: new Date().toISOString(),
      role: 'merchant_owner',
    };

    this.inMemoryAccount = account;

    try {
      localStorage.setItem(LOCAL_STORAGE_ACCOUNT_KEY, JSON.stringify(account));
    } catch {
      // Ignore storage errors in restricted contexts
    }

    return account;
  }

  public async clearUserSession(): Promise<void> {
    this.inMemoryAccount = null;
    try {
      localStorage.removeItem(LOCAL_STORAGE_ACCOUNT_KEY);
    } catch {
      // Ignore
    }
  }
}

// Export singleton instance ready for future dependency injection
export const emailRecipientService: EmailRecipientResolver = new DefaultEmailRecipientProvider();

/**
 * Validates whether a string matches standard RFC email formatting.
 */
export function isValidEmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email.trim());
}
