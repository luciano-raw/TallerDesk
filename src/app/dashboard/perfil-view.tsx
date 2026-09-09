'use client';

import { useState, useEffect } from 'react';
import { updateTallerProfile } from '@/lib/db-actions';
import { Save, ExternalLink } from 'lucide-react';

export default function PerfilView({ config, onUpdate }: { config: any, onUpdate: () => void }) {
  const [formData, setFormData] = useState({
    descripcionPublica: config?.descripcionPublica || '',
    horarioAtencion: config?.horarioAtencion || '',
    telefonoContacto: config?.telefonoContacto || '',
    emailContacto: config?.emailContacto || '',
    logoUrl: config?.logoUrl || '',
    ubicacion: config?.ubicacion || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      await updateTallerProfile(config.id, formData);
      setMessage('Perfil guardado exitosamente');
      onUpdate();
    } catch (e) {
      setMessage('Error al guardar el perfil');
    }
    setIsSaving(false);
  };

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/taller/${config?.slug}` : '';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white border p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-2">Perfil Público del Taller</h2>
        <p className="text-sm text-gray-500 mb-6">Configura la información que verán tus clientes en tu página pública de agendamiento.</p>
        
        {config?.slug && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Tu Enlace Público</p>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-2">
                {publicUrl} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Descripción de tu Taller</label>
            <textarea 
              value={formData.descripcionPublica} 
              onChange={e => setFormData({...formData, descripcionPublica: e.target.value})}
              className="w-full border rounded-lg p-3 text-sm min-h-[100px]"
              placeholder="Ej: Somos un taller multimarca especializado en frenos y suspensión con más de 10 años de experiencia..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Horario de Atención</label>
              <input 
                type="text"
                value={formData.horarioAtencion} 
                onChange={e => setFormData({...formData, horarioAtencion: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Ej: Lun a Vie 09:00 a 18:00 hrs"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Teléfono de Contacto</label>
              <input 
                type="text"
                value={formData.telefonoContacto} 
                onChange={e => setFormData({...formData, telefonoContacto: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Ej: +56 9 1234 5678"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email de Contacto</label>
              <input 
                type="email"
                value={formData.emailContacto} 
                onChange={e => setFormData({...formData, emailContacto: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Ej: contacto@mitaller.cl"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Dirección / Ubicación</label>
              <input 
                type="text"
                value={formData.ubicacion} 
                onChange={e => setFormData({...formData, ubicacion: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Ej: Av. Principal 123, Santiago"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Logo URL (Opcional)</label>
              <input 
                type="text"
                value={formData.logoUrl} 
                onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Ej: https://misitio.com/logo.png"
              />
            </div>
          </div>

          {message && (
            <p className={`text-sm font-semibold mt-4 ${message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </p>
          )}

          <div className="pt-4 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : <><Save className="w-4 h-4"/> Guardar Perfil</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
