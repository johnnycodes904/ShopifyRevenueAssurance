import { useState, useEffect, useCallback } from 'react';
import {
  UserAccount,
  emailRecipientService,
  isValidEmailAddress,
} from '../services/userAccount';

export interface UseUserAccountReturn {
  account: UserAccount | null;
  accountEmail: string | null;
  isLoading: boolean;
  isAccountLinked: boolean;
  linkEmail: (email: string, name?: string) => Promise<boolean>;
  unlinkAccount: () => Promise<void>;
  validateEmail: (email: string) => boolean;
}

/**
 * Hook to provide current user account data and email recipient resolution.
 * Extensible for future account systems.
 */
export function useUserAccount(): UseUserAccountReturn {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAccount = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await emailRecipientService.getUserAccount();
      setAccount(user);
    } catch (err) {
      console.warn('Failed to load user account:', err);
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const linkEmail = async (email: string, name?: string): Promise<boolean> => {
    if (!isValidEmailAddress(email)) {
      return false;
    }
    try {
      const updated = await emailRecipientService.linkUserEmail(email, name);
      setAccount(updated);
      return true;
    } catch {
      return false;
    }
  };

  const unlinkAccount = async (): Promise<void> => {
    await emailRecipientService.clearUserSession();
    setAccount(null);
  };

  return {
    account,
    accountEmail: account?.email || null,
    isLoading,
    isAccountLinked: !!account?.email,
    linkEmail,
    unlinkAccount,
    validateEmail: isValidEmailAddress,
  };
}
