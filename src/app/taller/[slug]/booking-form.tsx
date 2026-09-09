'use client';

import { useState } from 'react';
import { createPublicReserva } from '@/lib/db-actions';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function BookingForm({ tallerId }: { tallerId: string }) {
  const [formData, setFormData] = useState({
    clienteNombre: '',
    clienteRut: '',
    clienteTelefono: '',
    patente: '',
    marca: '',
    modelo: '',
    fechaHora: '',
    tipoServicio: '',
    observaciones: ''
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await createPublicReserva(tallerId, formData);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
        <CheckCircle2 size={64} className="text-green-500 mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Reserva Enviada!</h3>
        <p className="text-gray-600 mb-6">Tu solicitud de hora ha sido ingresada a la agenda del taller. Nos pondremos en contacto contigo si hay algún inconveniente.</p>
        <button 
          onClick={() => {
            setFormData({
              clienteNombre: '', clienteRut: '', clienteTelefono: '', patente: '', marca: '', modelo: '', fechaHora: '', tipoServicio: '', observaciones: ''
            });
            setStatus('idle');
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Hacer otra reserva
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Tu Nombre *</label>
          <input required type="text" value={formData.clienteNombre} onChange={e => setFormData({...formData, clienteNombre: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Ej: Juan Pérez" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Teléfono *</label>
          <input required type="tel" value={formData.clienteTelefono} onChange={e => setFormData({...formData, clienteTelefono: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Ej: +56912345678" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">RUT (Opcional)</label>
          <input type="text" value={formData.clienteRut} onChange={e => setFormData({...formData, clienteRut: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Ej: 12.345.678-9" />
        </div>
      </div>

      <hr className="border-gray-200" />
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Patente Vehículo *</label>
          <input required type="text" value={formData.patente} onChange={e => setFormData({...formData, patente: e.target.value.toUpperCase()})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm uppercase" placeholder="Ej: ABCD12" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Marca *</label>
          <input required type="text" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Ej: Toyota" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Modelo *</label>
          <input required type="text" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Ej: Yaris" />
        </div>
      </div>

      <hr className="border-gray-200" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Motivo o Servicio Deseado *</label>
          <input required type="text" value={formData.tipoServicio} onChange={e => setFormData({...formData, tipoServicio: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Ej: Mantención 10.000Km, Ruidos extraños..." />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Fecha y Hora Propuesta *</label>
          <input required type="datetime-local" value={formData.fechaHora} onChange={e => setFormData({...formData, fechaHora: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-700">Observaciones Adicionales (Opcional)</label>
        <textarea value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm min-h-[80px]" placeholder="Ej: Hace un sonido al frenar..." />
      </div>

      {status === 'error' && (
        <p className="text-red-500 font-semibold text-sm">Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.</p>
      )}

      <button 
        type="submit" 
        disabled={status === 'submitting'}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {status === 'submitting' ? (
          <><Loader2 className="animate-spin" size={20} /> Enviando...</>
        ) : 'Solicitar Hora'}
      </button>

    </form>
  );
}
