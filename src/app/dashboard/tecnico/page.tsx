import TecnicoClient from "./tecnico-client";
import { syncUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TecnicoPage() {
  // Sincroniza el usuario autenticado de Clerk con Supabase
  const dbUser = await syncUser();

  // Guard de seguridad: si no está logueado o no tiene taller operativo asignado, a /dashboard
  if (!dbUser || (!dbUser.tallerId && dbUser.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  return <TecnicoClient initialDbUser={dbUser} />;
}
