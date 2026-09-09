import { syncUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";
import SelectTallerClient from "./client";

export const dynamic = "force-dynamic";

export default async function SelectTallerPage() {
  const user = await syncUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Si no requiere seleccin, redirigir al dashboard
  if (!user._requiresTallerSelection) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Bienvenido de vuelta</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">
          Tu cuenta está asociada a varios talleres. Por favor elige a cuál deseas ingresar.
        </p>

        <SelectTallerClient talleres={user.talleresDisponibles || []} />
      </div>
    </div>
  );
}
