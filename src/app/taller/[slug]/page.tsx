import { getPublicTallerInfo } from "@/lib/db-actions";
import { notFound } from "next/navigation";
import BookingForm from "./booking-form";
import { MapPin, Phone, Clock, Mail } from "lucide-react";

export default async function PublicTallerPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const taller = await getPublicTallerInfo(resolvedParams.slug);

  if (!taller) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {taller.logoUrl ? (
              <img src={taller.logoUrl} alt={`Logo ${taller.nombre}`} className="w-16 h-16 object-contain rounded-lg border bg-white" />
            ) : (
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-2xl border border-blue-200">
                {taller.nombre.substring(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{taller.nombre}</h1>
              <p className="text-sm text-gray-500">Impulsado por TallerDesk</p>
            </div>
          </div>
          
          <div className="flex flex-col text-sm text-gray-600 gap-2">
            {taller.horarioAtencion && (
              <div className="flex items-center gap-2"><Clock size={16} className="text-blue-500"/> {taller.horarioAtencion}</div>
            )}
            {taller.telefonoContacto && (
              <div className="flex items-center gap-2"><Phone size={16} className="text-blue-500"/> {taller.telefonoContacto}</div>
            )}
            {taller.ubicacion && (
              <div className="flex items-center gap-2"><MapPin size={16} className="text-blue-500"/> {taller.ubicacion}</div>
            )}
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: Descripción */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 text-gray-800">Sobre el Taller</h2>
            {taller.descripcionPublica ? (
              <div className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">
                {taller.descripcionPublica}
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm">Este taller aún no ha agregado una descripción.</p>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Formulario de Reserva */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-bold text-xl mb-2 text-gray-800">Reserva tu Hora</h2>
            <p className="text-sm text-gray-500 mb-6">Completa tus datos y enviaremos la solicitud de reserva al taller.</p>
            <BookingForm tallerId={taller.id} />
          </div>
        </div>

      </main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-400">
          Powered by <a href="/" className="font-semibold hover:text-blue-600 transition-colors">TallerDesk</a>
        </div>
      </footer>
    </div>
  );
}
