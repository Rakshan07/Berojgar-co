import { createContext, useContext } from 'react';
export const Account = createContext(null);
export function useWorkspaceAccount() { return useContext(Account); }
