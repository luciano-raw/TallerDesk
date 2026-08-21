"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Car, User, Settings, CheckCircle2, AlertCircle, Plus, X, ArrowRight } from "lucide-react";
import { getReservas, createReserva, updateReservaEstado, getTallerLimiteReservas, updateLimiteReservas } from "@/lib/db-actions";
import { ComboboxVehiculo } from "@/components/ui/combobox-vehiculo";
import { getAllBrands, getModelsForBrand } from "@/lib/vehicle-data";

export default function AgendaView({ tallerId, readOnly = false, onConvertToOT }: { tallerId: string, readOnly?: boolean, onConvertToOT: (reserva: any) => void }) {
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [limiteDiario, setLimiteDiario] = useState(10);
  const [horaApertura, setHoraApertura] = useState("08:00");
  const [horaCierre, setHoraCierre] = useState("19:00");
  const [showSettings, setShowSettings] = useState(false);
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [newReserva, setNewReserva] = useState({
    clienteNombre: "",
    clienteTelefono: "",
    clienteRut: "",
    patente: "",
    marca: "",
    modelo: "",
    hora: "10:00",
    tipoServicio: "",
    observaciones: ""
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate, tallerId]);

  const fetchData = async () => {
    setLoading(true);
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    
    const [res, config] = await Promise.all([
      getReservas(tallerId, start, end),
      getTallerLimiteReservas(tallerId)
    ]);
    
    setReservas(res);
    setLimiteDiario(config.limite);
    setHoraApertura(config.horaApertura);
    setHoraCierre(config.horaCierre);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (reservas.length >= limiteDiario) {
      alert("Se ha alcanzado el límite de reservas para este día.");
      return;
    }
    
    const [h, m] = newReserva.hora.split(":");
    const fechaHora = new Date(selectedDate);
    fechaHora.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);

    const res = await createReserva({
      tallerId,
      ...newReserva,
      fechaHora
    });

    if (res.success) {
      setShowNewModal(false);
      setNewReserva({ clienteNombre: "", clienteTelefono: "", clienteRut: "", patente: "", marca: "", modelo: "", hora: horaApertura, tipoServicio: "", observaciones: "" });
      fetchData();
    } else {
      alert(res.error);
    }
  };

  const handleChangeStatus = async (id: string, status: any) => {
    if (readOnly) return;
    const res = await updateReservaEstado(id, status);
    if (res.success) fetchData();
  };

  const handleUpdateLimite = async () => {
    await updateLimiteReservas(tallerId, limiteDiario, horaApertura, horaCierre);
    setShowSettings(false);
  };

  const timeSlots = [];
  const startHour = parseInt(horaApertura.split(":")[0]);
  const endHour = parseInt(horaCierre.split(":")[0]);
  
  for (let i = startHour; i <= endHour; i++) {
    for (let j = 0; j < 60; j += 15) {
      if (i === endHour && j > 0) continue; // No exceder la hora exacta de cierre si es en punto
      const hh = i.toString().padStart(2, "0");
      const mm = j.toString().padStart(2, "0");
      timeSlots.push(`${hh}:${mm}`);
    }
  }

  const brands = getAllBrands();
  const models = getModelsForBrand(newReserva.marca);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">Agenda del Taller</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Gestiona las citas e ingreso de vehículos. Horario: {horaApertura} a {horaCierre}</p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSettings(true)}
              className="bg-muted text-muted-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-muted/80 flex items-center gap-2"
            >
              <Settings size={14} /> Configuración
            </button>
            <button 
              onClick={() => {
                setNewReserva({...newReserva, hora: horaApertura});
                setShowNewModal(true);
              }}
              className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 flex items-center gap-2 shadow-sm"
            >
              <Plus size={14} /> Nueva Cita
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-card border border-border rounded-xl p-4">
          <input 
            type="date" 
            value={selectedDate.toISOString().split("T")[0]} 
            onChange={(e) => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
            className="w-full p-2 rounded-lg border border-input bg-background text-sm"
          />
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Reservas hoy:</span>
              <span className="font-bold">{reservas.length} / {limiteDiario}</span>
            </div>
          </div>
        </div>
        <div className="md:col-span-3 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando agenda...</p>
          ) : reservas.length === 0 ? (
            <div className="text-center py-10 bg-muted/20 border border-dashed border-border rounded-xl">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No hay reservas para este día.</p>
            </div>
          ) : (
            reservas.map(reserva => (
              <div key={reserva.id} className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm">
                <div className="flex gap-4 items-start">
                  <div className="bg-primary/10 text-primary p-3 rounded-lg flex flex-col items-center justify-center min-w-[60px]">
                    <Clock size={16} className="mb-1" />
                    <span className="font-bold text-xs">{new Date(reserva.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{reserva.patente} - {reserva.marca} {reserva.modelo}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><User size={12} /> {reserva.clienteNombre}</span>
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px] uppercase font-bold">{reserva.estado}</span>
                    </div>
                    <p className="text-xs mt-2 font-medium">{reserva.tipoServicio}</p>
                    {reserva.observaciones && <p className="text-[10px] text-muted-foreground mt-1">{reserva.observaciones}</p>}
                  </div>
                </div>
                
                {!readOnly && (reserva.estado === "AGENDADA" || reserva.estado === "CONFIRMADA") && (
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => onConvertToOT(reserva)}
                      className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ArrowRight size={14} /> Ingresar a Taller (Crear OT)
                    </button>
                    {reserva.estado === "AGENDADA" && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleChangeStatus(reserva.id, "CONFIRMADA")} className="flex-1 bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                          Confirmar
                        </button>
                        <button onClick={() => handleChangeStatus(reserva.id, "NO_ASISTIO")} className="flex-1 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                          No Asistió
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL CONFIGURACION */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-border">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold">Configuración de Agenda</h3>
              <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Hora de Apertura</label>
                  <input 
                    type="time" 
                    value={horaApertura} 
                    onChange={e => setHoraApertura(e.target.value)} 
                    className="w-full p-2 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Hora de Cierre</label>
                  <input 
                    type="time" 
                    value={horaCierre} 
                    onChange={e => setHoraCierre(e.target.value)} 
                    className="w-full p-2 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Límite Diario de Reservas</label>
                <input 
                  type="number" 
                  value={limiteDiario} 
                  onChange={e => setLimiteDiario(parseInt(e.target.value) || 0)} 
                  className="w-full p-2 rounded-lg border border-input bg-background text-sm"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
              <button onClick={handleUpdateLimite} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA CITA */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-xl overflow-hidden shadow-2xl border border-border">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold">Agendar Nueva Cita</h3>
              <button onClick={() => setShowNewModal(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Patente</label>
                  <input type="text" value={newReserva.patente} onChange={e => setNewReserva({...newReserva, patente: e.target.value})} className="w-full p-2 rounded-lg border border-input bg-background text-sm uppercase" placeholder="AAAA11" />
                </div>
                <div className="col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <ComboboxVehiculo 
                      label="Marca"
                      placeholder="Ej. TOYOTA"
                      value={newReserva.marca}
                      onChange={(val) => setNewReserva({...newReserva, marca: val, modelo: ""})}
                      options={brands}
                    />
                    <ComboboxVehiculo 
                      label="Modelo"
                      placeholder="Ej. YARIS"
                      value={newReserva.modelo}
                      onChange={(val) => setNewReserva({...newReserva, modelo: val})}
                      options={models}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Nombre Cliente</label>
                  <input type="text" value={newReserva.clienteNombre} onChange={e => setNewReserva({...newReserva, clienteNombre: e.target.value})} className="w-full p-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Teléfono</label>
                  <input type="text" value={newReserva.clienteTelefono} onChange={e => setNewReserva({...newReserva, clienteTelefono: e.target.value})} className="w-full p-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">RUT (Opcional)</label>
                  <input type="text" value={newReserva.clienteRut} onChange={e => setNewReserva({...newReserva, clienteRut: e.target.value})} className="w-full p-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Hora de Ingreso</label>
                  <select value={newReserva.hora} onChange={e => setNewReserva({...newReserva, hora: e.target.value})} className="w-full p-2 rounded-lg border border-input bg-background text-sm">
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Tipo de Servicio</label>
                  <input type="text" value={newReserva.tipoServicio} onChange={e => setNewReserva({...newReserva, tipoServicio: e.target.value})} className="w-full p-2 rounded-lg border border-input bg-background text-sm" placeholder="Ej: Mantención 40.000 KM" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-2">
              <button onClick={() => setShowNewModal(false)} className="bg-background text-foreground border border-border px-4 py-2 rounded-lg text-xs font-semibold">Cancelar</button>
              <button onClick={handleCreate} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold">Agendar Cita</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
