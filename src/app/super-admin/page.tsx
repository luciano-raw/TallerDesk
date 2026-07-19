import SuperAdminClient from "./super-admin-client";
import { syncUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  // Sincroniza la cuenta logueada en Clerk con la base de datos de Supabase
  const dbUser = await syncUser();

  // Guard de seguridad: si no está logueado o su rol no es SUPER_ADMIN global, redirigir a /dashboard
  if (!dbUser || dbUser.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return <SuperAdminClient />;
}
