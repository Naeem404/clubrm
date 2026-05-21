import React, { createContext, useContext, useEffect, useState } from "react";
import { logError } from "@/lib/logger";
import { useAuth } from "@/context/auth-context";

export type Role =
  | "President"
  | "VP Internal"
  | "VP Finance"
  | "VP Events"
  | "VP External"
  | "Marketing"
  | "Executive"
  | "Administrator";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, updateProfile } = useAuth();
  const [role, setRole] = useState<Role>(() => {
    const saved = localStorage.getItem("clubrm-demo-role") as Role;
    return saved || "President";
  });

  useEffect(() => {
    if (profile?.role) {
      const nextRole = profile.role as Role;
      setRole(nextRole);
      localStorage.setItem("clubrm-demo-role", nextRole);
    }
  }, [profile?.role]);

  const handleSetRole = async (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem("clubrm-demo-role", newRole);

    if (user && profile?.full_name) {
      try {
        await updateProfile({
          full_name: profile.full_name,
          role: newRole,
        });
      } catch (error) {
        logError("role update failed", 'RoleContext', error);
      }
    }
  };

  return (
    <RoleContext.Provider value={{ role, setRole: handleSetRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
