import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { normalizeRole } from "@/lib/permissions";

export type Role =
  | "President"
  | "VP Internal"
  | "VP Finance"
  | "VP Events"
  | "VP External"
  | "Marketing"
  | "Executive"
  | "Administrator";

/**
 * The role is derived ONLY from the server-side `profiles.role` column.
 * There is intentionally no `setRole`: roles are assigned by a President /
 * Administrator through the `set_member_role` RPC (see settings page).
 */
interface RoleContextType {
  role: Role;
  /** Raw value stored in profiles.role (may be legacy, e.g. "member"). */
  rawRole: string | null;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

function useDerivedRole(): RoleContextType {
  const { profile } = useAuth();
  const rawRole = profile?.role ?? null;
  return useMemo(() => ({ role: normalizeRole(rawRole), rawRole }), [rawRole]);
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const value = useDerivedRole();
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  // Fallback keeps components working if rendered outside RoleProvider (e.g. tests);
  // the value is still derived purely from the authenticated profile.
  const derived = useDerivedRole();
  return context ?? derived;
}
