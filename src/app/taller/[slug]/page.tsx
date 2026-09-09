import { getPublicTallerInfo } from "@/lib/db-actions";
import { notFound } from "next/navigation";
import BookingForm from "./booking-form";
import { MapPin, Phone, Clock, Mail } from "lucide-react";
import { ThemeToggleButton } from "@/components/theme-toggle-button";

export default async function PublicTallerPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const taller = await getPublicTallerInfo(resolvedParams.slug);

  if (!taller) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {taller.logoUrl ? (
              <img src={taller.logoUrl} alt={`Logo ${taller.nombre}`} className="w-16 h-16 object-contain rounded-lg border bg-card" />
            ) : (
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold text-2xl border border-blue-200">
                {taller.nombre.substring(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{taller.nombre}</h1>
              <p className="text-sm text-muted-foreground">Impulsado por TallerDesk</p>
            </div>
          </div>
          
          <div className="flex flex-col text-sm text-muted-foreground gap-2">
            {taller.horarioAtencion && (
              <div className="flex items-center gap-2"><Clock size={16} className="text-primary"/> {taller.horarioAtencion}</div>
            )}
            {taller.telefonoContacto && (
              <div className="flex items-center gap-2"><Phone size={16} className="text-primary"/> {taller.telefonoContacto}</div>
            )}
            {taller.ubicacion && (
              <div className="flex items-center gap-2"><MapPin size={16} className="text-primary"/> {taller.ubicacion}</div>
            )}
            <div className="mt-2 md:mt-0 flex items-center md:ml-4">
              <ThemeToggleButton />
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: Descripción */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 text-foreground">Sobre el Taller</h2>
            {taller.descripcionPublica ? (
              <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                {taller.descripcionPublica}
              </div>
            ) : (
              <p className="text-muted-foreground italic text-sm">Este taller aún no ha agregado una descripción.</p>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Formulario de Reserva */}
        <div className="md:col-span-2">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="font-bold text-xl mb-2 text-foreground">Reserva tu Hora</h2>
            <p className="text-sm text-muted-foreground mb-6">Completa tus datos y enviaremos la solicitud de reserva al taller.</p>
            <BookingForm tallerId={taller.id} />
          </div>
        </div>

      </main>

      <footer className="bg-card border-t border-border py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Powered by <a href="/" className="font-semibold hover:text-primary transition-colors">TallerDesk</a>
        </div>
      </footer>
    </div>
  );
}
