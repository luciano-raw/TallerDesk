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
export type UserRole = "SUPER_ADMIN" | "TALLER_ADMIN" | "TALLER_JEFE" | "TALLER_RECEP" | "TALLER_TECNICO" | "PENDIENTE";

type MockUser = {
  id: string;
  fullName: string;
  email: string;
  roles: UserRole[];
  tallerName: string;
  tallerSlug: string;
  permisos: any;
};

const mockUsers: Record<UserRole, MockUser> = {
  SUPER_ADMIN: {
    id: "user_super_admin",
    fullName: "Luciano (Super Admin)",
    email: "luciano@tallerdesk.com",
    roles: ["SUPER_ADMIN"],
    tallerName: "TallerDesk SaaS Platform",
    tallerSlug: "system",
    permisos: {}
  },
  TALLER_ADMIN: {
    id: "user_taller_admin",
    fullName: "Don Carlos (Admin de Taller)",
    email: "carlos@tallerlosamigos.com",
    roles: ["TALLER_ADMIN"],
    tallerName: "Taller Los Amigos",
    tallerSlug: "taller-los-amigos",
    permisos: { CAN_EDIT_OT: true, CAN_DELETE_OT: true, CAN_VIEW_BODEGA: true, CAN_MANAGE_BODEGA: true, CAN_MANAGE_WORKERS: true }
  },
  TALLER_JEFE: {
    id: "user_taller_jefe",
    fullName: "Roberto (Jefe de Taller)",
    email: "roberto@tallerlosamigos.com",
    roles: ["TALLER_JEFE"],
    tallerName: "Taller Los Amigos",
    tallerSlug: "taller-los-amigos",
    permisos: { CAN_EDIT_OT: true, CAN_DELETE_OT: false, CAN_VIEW_BODEGA: true, CAN_MANAGE_BODEGA: true }
  },
  TALLER_RECEP: {
    id: "user_taller_recep",
    fullName: "Marta Gómez (Recepcionista)",
    email: "marta@tallerlosamigos.com",
    roles: ["TALLER_RECEP"],
    tallerName: "Taller Los Amigos",
    tallerSlug: "taller-los-amigos",
    permisos: { CAN_EDIT_OT: true, CAN_DELETE_OT: false, CAN_VIEW_BODEGA: false, CAN_MANAGE_BODEGA: false }
  },
  TALLER_TECNICO: {
    id: "user_taller_tecnico",
    fullName: "Alexis Sánchez (Mecánico)",
    email: "alexis@tallerlosamigos.com",
    roles: ["TALLER_TECNICO"],
    tallerName: "Taller Los Amigos",
    tallerSlug: "taller-los-amigos",
    permisos: { CAN_EDIT_OT: false, CAN_DELETE_OT: false, CAN_VIEW_BODEGA: false, CAN_MANAGE_BODEGA: false }
  },
  PENDIENTE: {
    id: "user_pendiente",
    fullName: "Usuario Nuevo",
    email: "nuevo@usuario.com",
    roles: ["PENDIENTE"],
    tallerName: "",
    tallerSlug: "",
    permisos: {}
  }
};

type AuthContextType = {
  roles: UserRole[];
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
    if (!isLoaded) return; // Esperar a que Clerk cargue

    if (!demoMode) {
      if (clerkUser) {
        getCurrentUserDbProfile({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          fullName: clerkUser.fullName || clerkUser.username || "Usuario",
        }).then((profile) => {
          setDbProfile(profile);
          setProfileLoading(false);
        }).catch(() => {
          setDbProfile(null);
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
      <AuthContext.Provider value={{ roles: [role], setRole, user, isSignedIn: true, isDemoMode: true }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Si no estamos en modo demo (Clerk + Supabase)
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 animate-spin">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
        </div>
        <h1 className="text-xl font-bold mb-2">Cargando perfil...</h1>
      </div>
    );
  }

  if (!demoMode && clerkUser && !dbProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute top-4 right-4">
          <OriginalClerkProvider>
            <ClerkUserButton />
          </OriginalClerkProvider>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Error de Sincronización</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          No se pudo sincronizar tu cuenta con la base de datos.
          <br/>Esto puede deberse a un error de conexión con Supabase o a un fallo en el servidor.
        </p>
      </div>
    );
  }

  let realRoles = dbProfile?.roles || ["TALLER_TECNICO"];
  if (!dbProfile?.tallerId && !realRoles.includes("SUPER_ADMIN")) {
    realRoles = ["PENDIENTE"];
  }

  const realUser = dbProfile ? {
    id: dbProfile.id,
    fullName: dbProfile.nombre,
    email: dbProfile.email,
    roles: realRoles,
    permisos: dbProfile.permisos || {},
    tallerName: dbProfile.tallerName || "Mi Taller Automotriz",
    tallerSlug: dbProfile.tallerSlug || "demo"
  } : null;

  return (
    <AuthContext.Provider value={{ 
      roles: realRoles, 
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
          publicMetadata: { role: demoContext.roles[0] },
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
      roles: context.roles,
      setRole: context.setRole,
      permisos: context.user?.permisos || {},
      tallerName: context.isDemoMode ? context.user.tallerName : (context.user?.tallerName || "Mi Taller Automotriz"),
      tallerSlug: context.isDemoMode ? context.user.tallerSlug : (context.user?.tallerSlug || "demo"),
      user: context.user
    };
  }

  return {
    isDemoMode: false,
    roles: ["TALLER_TECNICO"] as UserRole[],
    setRole: () => {},
    permisos: {},
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
    const roleText = (demoContext?.roles?.[0] || "TALLER_TECNICO").replace("TALLER_", "").toLowerCase();
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
