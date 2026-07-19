"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ClerkProvider as OriginalClerkProvider, UserButton as ClerkUserButton, useUser as useClerkUser, useAuth as useClerkAuth, SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { getCurrentUserDbProfile } from "@/lib/db-actions";

// Determinar si estamos en Modo Demo (sin Clerk)
const isDemo = () => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return !key || key === "pk_test_placeholder" || key.startsWith("your_clerk_");
};

// --- ESTRUCTURA MOCK PARA MODO DEMO ---
export type UserRole = "SUPER_ADMIN" | "TALLER_ADMIN" | "TALLER_RECEP" | "TALLER_TECNICO";

type MockUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  tallerName: string;
  tallerSlug: string;
};

const mockUsers: Record<UserRole, MockUser> = {
  SUPER_ADMIN: {
    id: "user_super_admin",
    fullName: "Luciano (Super Admin)",
    email: "luciano@tallerdesk.com",
    role: "SUPER_ADMIN",
    tallerName: "TallerDesk SaaS Platform",
    tallerSlug: "system"
  },
  TALLER_ADMIN: {
    id: "user_taller_admin",
    fullName: "Don Carlos (Admin de Taller)",
    email: "carlos@tallerlosamigos.com",
    role: "TALLER_ADMIN",
    tallerName: "Taller Los Amigos",
    tallerSlug: "taller-los-amigos"
  },
  TALLER_RECEP: {
    id: "user_taller_recep",
    fullName: "Marta Gómez (Recepcionista)",
    email: "marta@tallerlosamigos.com",
    role: "TALLER_RECEP",
    tallerName: "Taller Los Amigos",
    tallerSlug: "taller-los-amigos"
  },
  TALLER_TECNICO: {
    id: "user_taller_tecnico",
    fullName: "Alexis Sánchez (Mecánico)",
    email: "alexis@tallerlosamigos.com",
    role: "TALLER_TECNICO",
    tallerName: "Taller Los Amigos",
    tallerSlug: "taller-los-amigos"
  }
};

type AuthContextType = {
  role: UserRole;
  setRole: (role: UserRole) => void;
  user: any;
  isSignedIn: boolean;
  isDemoMode: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, dbUser }: { children: React.ReactNode; dbUser?: any }) {
  const [demoMode, setDemoMode] = useState(false);
  const [role, setRoleState] = useState<UserRole>("SUPER_ADMIN");
  const [dbProfile, setDbProfile] = useState<any>(dbUser || null);
  const [profileLoading, setProfileLoading] = useState(!dbUser);
  const { user: clerkUser, isLoaded } = useClerkUser();

  useEffect(() => {
    setDemoMode(isDemo());
    const savedRole = localStorage.getItem("tallerdesk-demo-role") as UserRole | null;
    if (savedRole && mockUsers[savedRole]) {
      setRoleState(savedRole);
    }
  }, []);

  useEffect(() => {
    if (!demoMode && isLoaded) {
      if (clerkUser) {
        getCurrentUserDbProfile().then((profile) => {
          setDbProfile(profile);
          setProfileLoading(false);
        });
      } else {
        setDbProfile(null);
        setProfileLoading(false);
      }
    } else {
      setProfileLoading(false);
    }
  }, [clerkUser, isLoaded, demoMode]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem("tallerdesk-demo-role", newRole);
  };

  // Si estamos en modo demo, usar datos mockup
  if (demoMode) {
    const user = mockUsers[role];
    return (
      <AuthContext.Provider value={{ role, setRole, user, isSignedIn: true, isDemoMode: true }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Si no estamos en modo demo (Clerk + Supabase)
  const realRole = dbProfile?.role || "TALLER_TECNICO";
  const realUser = dbProfile ? {
    id: dbProfile.id,
    fullName: dbProfile.nombre,
    email: dbProfile.email,
    role: realRole,
    tallerName: dbProfile.tallerName || "Mi Taller Automotriz",
    tallerSlug: dbProfile.tallerSlug || "demo"
  } : null;

  return (
    <AuthContext.Provider value={{ 
      role: realRole, 
      setRole: () => {}, 
      user: realUser, 
      isSignedIn: !!dbProfile, 
      isDemoMode: false 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useUser() {
  try {
    const demoContext = useContext(AuthContext);
    if (demoContext) {
      return {
        isSignedIn: true,
        isLoaded: true,
        user: {
          id: demoContext.user.id,
          fullName: demoContext.user.fullName,
          primaryEmailAddress: { emailAddress: demoContext.user.email },
          publicMetadata: { role: demoContext.role },
          unsafeMetadata: { tallerSlug: demoContext.user.tallerSlug }
        }
      };
    }
  } catch (e) {
    // Si falla por no estar en contexto, ignorar
  }

  // Si estamos en modo demo y no hay contexto (ej: páginas de error fuera del layout)
  // retornamos un fallback demo en vez de llamar a Clerk y provocar crash de compilación
  if (isDemo()) {
    return {
      isSignedIn: true,
      isLoaded: true,
      user: {
        id: "demo_fallback",
        fullName: "Usuario Demo",
        primaryEmailAddress: { emailAddress: "demo@tallerdesk.com" },
        publicMetadata: { role: "TALLER_TECNICO" as UserRole },
        unsafeMetadata: { tallerSlug: "demo" }
      }
    };
  }

  // De lo contrario, usar Clerk original
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkUser();
}

export function useAuth() {
  try {
    const demoContext = useContext(AuthContext);
    if (demoContext) {
      return {
        userId: demoContext.user.id,
        isSignedIn: true,
        isLoaded: true,
        orgId: null,
      };
    }
  } catch (e) {
    // ignorar
  }

  if (isDemo()) {
    return {
      userId: "demo_fallback",
      isSignedIn: true,
      isLoaded: true,
      orgId: null,
    };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkAuth();
}

// Custom hook para obtener detalles específicos del Taller/Rol en el sistema
export function useSystemAuth() {
  const context = useContext(AuthContext);
  
  if (context) {
    return {
      isDemoMode: context.isDemoMode,
      role: context.role,
      setRole: context.setRole,
      tallerName: context.isDemoMode ? context.user.tallerName : (context.user?.tallerName || "Mi Taller Automotriz"),
      tallerSlug: context.isDemoMode ? context.user.tallerSlug : (context.user?.tallerSlug || "demo"),
      user: context.user
    };
  }

  return {
    isDemoMode: false,
    role: "TALLER_TECNICO" as UserRole,
    setRole: () => {},
    tallerName: "Mi Taller Automotriz",
    tallerSlug: "demo",
    user: null
  };
}

// --- COMPONENTES ABSTRACTOS ---
export function SignedIn({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  if (isSignedIn) {
    return <>{children}</>;
  }
  return null;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  if (!isSignedIn) {
    return <>{children}</>;
  }
  return null;
}

export function UserButton() {
  const demoContext = useContext(AuthContext);
  
  if (isDemo() || demoContext?.isDemoMode) {
    const fullName = demoContext?.user.fullName || "Usuario Demo";
    const roleText = (demoContext?.role || "TALLER_TECNICO").replace("TALLER_", "").toLowerCase();
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 bg-card p-2 rounded-lg border border-border shadow-sm">
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold">{fullName}</span>
            <span className="text-[10px] text-muted-foreground capitalize">{roleText}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
            {fullName.charAt(0)}
          </div>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem("tallerdesk-demo-role");
            window.location.href = "/";
          }}
          className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Salir de Demo"
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <ClerkUserButton />
      <SignOutButton redirectUrl="/">
        <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold transition-all cursor-pointer">
          <LogOut size={14} />
          Cerrar Sesión
        </button>
      </SignOutButton>
    </div>
  );
}

// --- CLERK PROVIDER CONDICIONAL ---
export function ProjectAuthProvider({ children, dbUser }: { children: React.ReactNode; dbUser?: any }) {
  const demoMode = isDemo();

  if (demoMode) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <OriginalClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <AuthProvider dbUser={dbUser}>{children}</AuthProvider>
    </OriginalClerkProvider>
  );
}
