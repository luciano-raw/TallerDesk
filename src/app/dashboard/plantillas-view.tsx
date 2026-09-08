'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, Settings } from 'lucide-react';
import { getPlantillasServicio, createPlantillaServicio, deletePlantillaServicio } from '@/lib/db-actions';

export default function PlantillasView() {
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [trabajos, setTrabajos] = useState([{ titulo: '', descripcion: '', costoBase: 0, tareas: [''] }]);

  useEffect(() => {
    loadPlantillas();
  }, []);

  const loadPlantillas = async () => {
    setIsLoading(true);
    try {
      const data = await getPlantillasServicio();
      setPlantillas(data);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleAddTrabajo = () => {
    setTrabajos([...trabajos, { titulo: '', descripcion: '', costoBase: 0, tareas: [''] }]);
  };

  const handleRemoveTrabajo = (index: number) => {
    setTrabajos(trabajos.filter((_, i) => i !== index));
  };

  const handleAddTarea = (tIndex: number) => {
    const newTrabajos = [...trabajos];
    newTrabajos[tIndex].tareas.push('');
    setTrabajos(newTrabajos);
  };

  const handleRemoveTarea = (tIndex: number, tareaIndex: number) => {
    const newTrabajos = [...trabajos];
    newTrabajos[tIndex].tareas = newTrabajos[tIndex].tareas.filter((_, i) => i !== tareaIndex);
    setTrabajos(newTrabajos);
  };

  const handleSave = async () => {
    if (!nombre.trim()) return alert('El nombre es obligatorio');
    
    const cleanedTrabajos = trabajos.filter(t => t.titulo.trim() !== '').map(t => ({
      ...t,
      tareas: t.tareas.filter(tarea => tarea.trim() !== '')
    }));

    if (cleanedTrabajos.length === 0) return alert('Debes agregar al menos un trabajo');

    try {
      await createPlantillaServicio({ nombre, descripcion, trabajos: cleanedTrabajos });
      setIsCreating(false);
      setNombre('');
      setDescripcion('');
      setTrabajos([{ titulo: '', descripcion: '', costoBase: 0, tareas: [''] }]);
      loadPlantillas();
    } catch (e) {
      console.error(e);
      alert('Error al guardar');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta plantilla?')) {
      await deletePlantillaServicio(id);
      loadPlantillas();
    }
  };

  if (isLoading) return <div className="p-8 text-center">Cargando plantillas...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2"><Settings className="w-5 h-5"/> Catálogo de Servicios Pre-establecidos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Crea plantillas para inyectar trabajos y tareas rápdiamente en una OT.</p>
        </div>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Nuevo Servicio
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="font-bold">Nueva Plantilla</h3>
            <button onClick={() => setIsCreating(false)}><X className="w-5 h-5 text-gray-500"/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre del Servicio *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Ej: Mantenimiento 10.000 Km" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción (Opcional)</label>
              <input value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Breve descripción" />
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <h4 className="font-semibold text-sm border-b pb-2">Trabajos a inyectar</h4>
            {trabajos.map((trabajo, tIndex) => (
              <div key={tIndex} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                <button onClick={() => handleRemoveTrabajo(tIndex)} className="absolute top-3 right-3 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 pr-8">
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-medium mb-1">Título del Trabajo</label>
                    <input value={trabajo.titulo} onChange={e => { const nt = [...trabajos]; nt[tIndex].titulo = e.target.value; setTrabajos(nt); }} className="w-full border rounded p-2 text-sm bg-white" placeholder="Ej: Cambio de Aceite" />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-medium mb-1">Descripción</label>
                    <input value={trabajo.descripcion} onChange={e => { const nt = [...trabajos]; nt[tIndex].descripcion = e.target.value; setTrabajos(nt); }} className="w-full border rounded p-2 text-sm bg-white" placeholder="..." />
                  </div>
                  <div className="col-span-12 md:col-span-2">
                    <label className="block text-xs font-medium mb-1">Costo Base ($)</label>
                    <input type="number" value={trabajo.costoBase} onChange={e => { const nt = [...trabajos]; nt[tIndex].costoBase = Number(e.target.value); setTrabajos(nt); }} className="w-full border rounded p-2 text-sm bg-white" />
                  </div>
                </div>

                <div className="pl-4 border-l-2 border-slate-300 space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Tareas (Checklist)</p>
                  {trabajo.tareas.map((tarea, tareaIndex) => (
                    <div key={tareaIndex} className="flex items-center gap-2">
                      <input value={tarea} onChange={e => { const nt = [...trabajos]; nt[tIndex].tareas[tareaIndex] = e.target.value; setTrabajos(nt); }} className="flex-1 border rounded px-2 py-1 text-xs bg-white" placeholder="Ej: Revisar nivel de líquido de frenos" />
                      <button onClick={() => handleRemoveTarea(tIndex, tareaIndex)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button>
                    </div>
                  ))}
                  <button onClick={() => handleAddTarea(tIndex)} className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"><Plus className="w-3 h-3"/> Añadir tarea</button>
                </div>
              </div>
            ))}
            <button onClick={handleAddTrabajo} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-800 transition-colors">
              + Añadir otro Trabajo
            </button>
          </div>
          
          <div className="pt-4 border-t flex justify-end gap-2">
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 border rounded-lg text-sm font-medium">Cancelar</button>
            <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">Guardar Plantilla</button>
          </div>
        </div>
      )}

      {!isCreating && plantillas.length === 0 && (
        <div className="text-center p-12 bg-gray-50 rounded-xl border border-dashed">
          <p className="text-gray-500 mb-4">No has creado ningún servicio pre-establecido aún.</p>
          <button onClick={() => setIsCreating(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">Crear mi primer servicio</button>
        </div>
      )}

      {!isCreating && plantillas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillas.map(p => (
            <div key={p.id} className="bg-white rounded-xl border p-5 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg leading-tight">{p.nombre}</h3>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
              </div>
              {p.descripcion && <p className="text-xs text-gray-500 mb-4">{p.descripcion}</p>}
              
              <div className="mt-auto pt-4 border-t">
                <p className="text-xs font-semibold mb-2">Trabajos incluidos ({p.trabajos.length}):</p>
                <ul className="text-xs space-y-1 text-gray-600 list-disc pl-4">
                  {p.trabajos.slice(0, 3).map((t: any) => (
                    <li key={t.id}>{t.titulo} <span className="text-gray-400">({t.tareas.length} tareas)</span></li>
                  ))}
                  {p.trabajos.length > 3 && <li className="text-gray-400">+ {p.trabajos.length - 3} trabajos más</li>}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
