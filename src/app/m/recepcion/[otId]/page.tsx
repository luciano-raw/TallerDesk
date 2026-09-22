import { getOTByIdParaRecepcion } from "@/lib/db-actions";
import { notFound } from "next/navigation";
import MobileWizardClient from "./client";
import { Car } from "lucide-react";

export default async function MobileReceptionPage({ params }: { params: { otId: string } }) {
  const ot = await getOTByIdParaRecepcion(params.otId);
  
  if (!ot) {
    return (
      <div className="p-8 text-center mt-20">
        <h1 className="text-xl font-bold text-red-500 mb-2">Error 404: OT no encontrada</h1>
        <p className="text-sm text-gray-500">ID Recibido en URL: {params.otId}</p>
      </div>
    );
  }

  // Si ya est cerrada, podemos evitar que suban fotos
  if (ot.estado === 'CERRADO' || ot.estado === 'ANULADO') {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 flex flex-col items-center justify-center text-center">
        <Car size={48} className="text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Orden Cerrada</h1>
        <p className="text-sm text-muted-foreground">Ya no se pueden adjuntar fotos a esta orden de trabajo.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-extrabold flex items-center gap-2">
          <Car size={20} className="text-primary" />
          Recepcin Vehicular
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {ot.vehiculo.marca} {ot.vehiculo.modelo} ({ot.vehiculo.patente})
        </p>
      </header>
      
      <main className="flex-1 p-4">
        <MobileWizardClient otId={ot.id} vehiculoInfo={` `} />
      </main>
    </div>
  );
}
