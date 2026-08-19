import DashboardClient from "./dashboard-client";
import { syncUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Sincroniza el usuario autenticado de Clerk con Supabase
  const dbUser = await syncUser();

  if (!dbUser) {
    // Si no está logueado o estamos en modo demo (sin credenciales reales),
    // renderizamos el DashboardClient normal
    return <DashboardClient initialDbUser={null} />;
  }

  // 1. Redirección automática si es SUPER_ADMIN global del SaaS
  if (dbUser.roles?.includes("SUPER_ADMIN")) {
    redirect("/super-admin");
  }

  // 2. Redirección automática si es un MECÁNICO / TÉCNICO del taller y ya está asignado (y es su único rol)
  if (dbUser.roles?.includes("TALLER_TECNICO") && dbUser.roles?.length === 1 && dbUser.tallerId) {
    redirect("/dashboard/tecnico");
  }

  // 3. Si no tiene taller asignado, está pendiente de aprobación (dueño o mecánico aún sin sucursal asignada)
  if (!dbUser.tallerId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6 animate-pulse">
          <Clock size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Cuenta en Espera de Aprobación</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Hola, <span className="font-semibold text-foreground">{dbUser.nombre}</span>. Tu solicitud de registro ha sido recibida correctamente en TallerDesk.
        </p>
        <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
          Un administrador global de la plataforma revisará tus datos a la brevedad para dar de alta tu taller y asignarte el acceso como dueño.
        </p>
        <div className="bg-card border border-border px-4 py-3 rounded-xl text-xs flex flex-col gap-1">
          <span className="text-muted-foreground">Email de contacto registrado:</span>
          <span className="font-semibold text-foreground">{dbUser.email}</span>
        </div>
      </div>
    );
  }

  // 4. Si tiene taller asignado y es ADMIN o RECEPCIONISTA del taller, renderizar el dashboard
  return <DashboardClient initialDbUser={dbUser} />;
}
