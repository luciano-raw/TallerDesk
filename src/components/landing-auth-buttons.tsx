"use client";

import Link from "next/link";
import { UserCheck, LogOut } from "lucide-react";
import { useSystemAuth } from "./auth-wrapper";
import { SignOutButton } from "@clerk/nextjs";

export function LandingAuthButtons() {
  const { user, isDemoMode } = useSystemAuth();

  // Si estamos en modo demo o no hay usuario real logueado, mostrar botón estándar
  if (isDemoMode || !user) {
    return (
      <Link 
        href="/dashboard"
        className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-white text-xs md:text-sm font-semibold hover:bg-primary/95 transition-all glow-green-sm hover:scale-[1.02] cursor-pointer"
      >
        <UserCheck size={14} />
        Iniciar Sesión
      </Link>
    );
  }

  // Si hay una sesión activa de Clerk, mostrar botones de continuar o cambiar cuenta
  return (
    <div className="flex items-center gap-3">
      <Link 
        href="/dashboard"
        className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-white text-xs md:text-sm font-semibold hover:bg-primary/95 transition-all glow-green-sm hover:scale-[1.02] cursor-pointer"
      >
        <UserCheck size={14} />
        Entrar como {user.fullName || user.email}
      </Link>
      <SignOutButton redirectUrl="/">
        <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold transition-all cursor-pointer">
          <LogOut size={14} />
          Cerrar Sesión
        </button>
      </SignOutButton>
    </div>
  );
}
