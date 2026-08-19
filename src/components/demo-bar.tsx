"use client";

import React from "react";
import { useSystemAuth, UserRole } from "@/components/auth-wrapper";
import { useTheme } from "@/components/theme-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Users, ClipboardList, PenTool, Home, Sun, Moon } from "lucide-react";

export function DemoBar() {
  const { isDemoMode, roles, setRole, user } = useSystemAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  if (!isDemoMode) return null;

  const rolesList: { name: string; value: UserRole; icon: any; color: string; path: string }[] = [
    { 
      name: "S. Admin", 
      value: "SUPER_ADMIN", 
      icon: Shield, 
      color: "bg-red-600",
      path: "/super-admin"
    },
    { 
      name: "T. Admin", 
      value: "TALLER_ADMIN", 
      icon: Users, 
      color: "bg-emerald-600",
      path: "/dashboard" 
    },
    { 
      name: "Recep.", 
      value: "TALLER_RECEP", 
      icon: ClipboardList, 
      color: "bg-blue-600",
      path: "/dashboard" 
    },
    { 
      name: "Técnico", 
      value: "TALLER_TECNICO", 
      icon: PenTool, 
      color: "bg-teal-600",
      path: "/dashboard/tecnico" 
    }
  ];

  const handleRoleChange = (newRole: UserRole, path: string) => {
    setRole(newRole);
    router.push(path);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl border border-border shadow-2xl bg-card/95 text-card-foreground max-w-[340px] md:max-w-md glow-green transition-all duration-300">
      <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
        <div className="flex items-center gap-1.5">
          <span className="animate-ping w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Simulador Demo SaaS</h4>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón de tema claro/oscuro */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            title="Cambiar tema"
          >
            {theme === "dark" ? <Sun size={14} className="text-yellow-400" /> : <Moon size={14} />}
          </button>
          <Link href="/" className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" title="Ir a Home">
            <Home size={14} />
          </Link>
        </div>
      </div>

      <div className="text-[11px] mb-3 text-muted-foreground">
        <p className="font-semibold text-foreground">{user.fullName}</p>
        <p className="truncate">Email: {user.email}</p>
        <p className="truncate font-medium text-primary mt-0.5">Taller: {user.tallerName}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {rolesList.map((r) => {
          const Icon = r.icon;
          const isSelected = roles?.includes(r.value);
          return (
            <button
              key={r.value}
              onClick={() => handleRoleChange(r.value, r.path)}
              className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs font-medium border transition-all ${
                isSelected 
                  ? "bg-primary border-primary text-white shadow-md scale-[1.02]" 
                  : "bg-muted/50 border-border hover:bg-muted text-foreground"
              }`}
            >
              <span className={`p-1 rounded-md ${isSelected ? "bg-white/20" : r.color} text-white`}>
                <Icon size={12} />
              </span>
              <span className="truncate">{r.name}</span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-border pt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Prueba vistas en tiempo real</span>
        <Link 
          href="/seguimiento/ot-demo-token" 
          className="text-primary hover:underline font-semibold"
        >
          Ver Portal Cliente ➡️
        </Link>
      </div>
    </div>
  );
}
