"use client";
import React, { useState, useEffect } from "react";
import { useSystemAuth } from "@/components/auth-wrapper";
import { UserButton } from "@/components/auth-wrapper";
import Link from "next/link";
import { 
  Wrench, 
  Car, 
  Camera, 
  MessageSquare, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Package,
  History,
  Timer
} from "lucide-react";
import { 
  getTecnicoOTs, 
  toggleTareaChecklist, 
  updateOTDiagnostico, 
  addOTFoto, 
  updateTrabajoEstado
} from "@/lib/db-actions";

interface TecnicoOT {
  id: string;
  codigo: string;
  patente: string;
  vehiculo: string;
  observaciones: string;
  status: string;
  startedAt: string | null;
  estimatedHours: number | null;
  checklist: { id: string; tarea: string; completada: boolean }[];
  fotos: { url: string; descripcion: string; fecha: string }[];
  repuestos: { id: string; descripcion: string; cantidad: number; inventarioId: string | null }[];
  notasMecanico: string[];
  trabajoId: string;
  trabajoTitulo: string;
  trabajoEstado: "PENDIENTE" | "EN_PROGRESO" | "FINALIZADO";
}
const initialTecnicoOTs: TecnicoOT[] = [];

export default function TecnicoClient({ initialDbUser }: { initialDbUser?: any }) {
  const { roles, user, isDemoMode } = useSystemAuth();
  const [ots, setOts] = useState<TecnicoOT[]>([]);
  const [selectedOtId, setSelectedOtId] = useState<string | null>(null);
  const [nuevaNota, setNuevaNota] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const loadDbOTs = async () => {
    const tecnicoId = initialDbUser?.id || user?.id;
    if (tecnicoId) {
      const dbOts = await getTecnicoOTs(tecnicoId);
      const mapped: TecnicoOT[] = [];
      dbOts.forEach((o: any) => {
        const misTrabajos = o.trabajos.filter((t: any) => t.tecnicoId === tecnicoId);
        misTrabajos.forEach((t: any) => {
          
          const repuestosOT = (o.itemsPresupuesto || []).filter((item: any) => item.tipo === "REPUESTO").map((item: any) => {
            const match = item.descripcion.match(/^(\d+)x /);
            const qty = match ? parseInt(match[1], 10) : 1;
            const desc = match ? item.descripcion.substring(match[0].length) : item.descripcion;
            return {
              id: item.id,
              descripcion: desc,
              cantidad: qty,
              inventarioId: item.inventarioItemId
            };
          });

          mapped.push({
            id: o.id,
            codigo: o.codigo,
            patente: o.vehiculo.patente,
            vehiculo: `${o.vehiculo.marca} ${o.vehiculo.modelo}`,
            observaciones: o.observaciones || "",
            status: o.status,
            startedAt: o.startedAt ? new Date(o.startedAt).toISOString() : null,
            estimatedHours: o.estimatedHours || 0,
            checklist: (t.tareas || []).map((c: any) => ({
              id: c.id,
              tarea: c.tarea,
              completada: c.completada
            })),
            repuestos: repuestosOT,
            fotos: o.fotos.map((f: any) => ({
              url: f.url,
              descripcion: f.descripcion || "",
              fecha: new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })),
            notasMecanico: o.diagnostico ? [o.diagnostico] : [],
            trabajoId: t.id,
            trabajoTitulo: t.titulo,
            trabajoEstado: t.estado
          });
        });
      });
      setOts(mapped);
      
      if (mapped.length > 0) {
        if (!selectedOtId || !mapped.some(o => o.trabajoId === selectedOtId)) {
          setSelectedOtId(mapped[0].trabajoId);
        }
      } else {
        setSelectedOtId(null);
      }
    }
  };

  useEffect(() => {
    if (!isDemoMode && (initialDbUser?.id || user?.id)) {
      loadDbOTs();
    } else if (isDemoMode) {
      setOts(initialTecnicoOTs);
      setSelectedOtId("ot_1");
    }
  }, [isDemoMode, initialDbUser, user]);

  if (!roles.includes("TALLER_TECNICO") && !roles.includes("TALLER_ADMIN") && !roles.includes("TALLER_JEFE")) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-6">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Esta vista móvil está adaptada exclusivamente para los **Mecánicos / Técnicos** dentro del taller. Tu rol actual es <span className="font-semibold text-primary capitalize">{roles.length > 0 ? roles[0].replace("TALLER_", "").toLowerCase() : "NINGUNO"}</span>.
        </p>
      </div>
    );
  }

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleChecklist = async (trabajoId: string, itemId: string) => {
    let nextState = false;
    let autoNewStatus: string | null = null;
    let currentStatus: string | null = null;
    let isAllComplete = true;

    const nextOts = ots.map(o => {
      if (o.trabajoId === trabajoId) {
        currentStatus = o.trabajoEstado;
        const nextChecklist = o.checklist.map((item: any) => {
          if (item.id === itemId) {
            nextState = !item.completada;
            return { ...item, completada: nextState };
          }
          return item;
        });

        isAllComplete = nextChecklist.every((item: any) => item.completada);
        const hasSomeComplete = nextChecklist.some((item: any) => item.completada);

        if (isAllComplete && currentStatus !== "FINALIZADO") {
          autoNewStatus = "FINALIZADO";
        } else if (!isAllComplete && hasSomeComplete && currentStatus !== "EN_PROGRESO") {
          autoNewStatus = "EN_PROGRESO";
        } else if (!hasSomeComplete && currentStatus !== "PENDIENTE") {
          autoNewStatus = "PENDIENTE";
        }

        return { ...o, checklist: nextChecklist, trabajoEstado: (autoNewStatus || currentStatus) as any };
      }
      return o;
    });

    setOts(nextOts);

    if (!isDemoMode) {
      const res = await toggleTareaChecklist(itemId, nextState);
      if (res.success) {
        if (autoNewStatus) {
          await updateTrabajoEstado(trabajoId, autoNewStatus as any);
          triggerNotification(`Checklist guardado. Estado actualizado a ${autoNewStatus}`);
        } else {
          triggerNotification("Checklist guardado.");
        }
        loadDbOTs();
      } else {
        triggerNotification(`Error: ${res.error}`);
      }
    }
  };

  const handleAddNota = async (otId: string) => {
    if (!nuevaNota.trim()) return;
    if (!isDemoMode) {
      const res = await updateOTDiagnostico(otId, nuevaNota);
      if (res.success) {
        triggerNotification("Nota guardada en la bitácora.");
        setNuevaNota("");
        loadDbOTs();
      } else {
        triggerNotification(`Error: ${res.error}`);
      }
    }
  };

  const handleUpdateStatus = async (trabajoId: string, newStatus: any) => {
    const nextOts = ots.map(o => {
      if (o.trabajoId === trabajoId) {
        return { ...o, trabajoEstado: newStatus };
      }
      return o;
    });
    setOts(nextOts);

    if (!isDemoMode) {
      const res = await updateTrabajoEstado(trabajoId, newStatus);
      if (res.success) {
        triggerNotification(`Estado de trabajo cambiado a ${newStatus}.`);
        loadDbOTs();
      } else {
        triggerNotification(`Error: ${res.error}`);
      }
    }
  };

  const handleSimulatePhoto = async (otId: string) => {
    const urls = [
      "https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=300",
      "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?q=80&w=300",
      "https://images.unsplash.com/photo-1530047625168-4b18fa29984e?q=80&w=300"
    ];
    const descripciones = [
      "Filtro de aire nuevo instalado",
      "Aceite de motor drenando",
      "Alineando suspensión delantera"
    ];
    const randomIdx = Math.floor(Math.random() * urls.length);
    const photoUrl = urls[randomIdx];
    const description = descripciones[randomIdx];

    if (!isDemoMode) {
      const res = await addOTFoto({
        ordenTrabajoId: otId,
        url: photoUrl,
        descripcion: description
      });
      if (res.success) {
        triggerNotification("📸 Avance fotográfico guardado en la Nube.");
        loadDbOTs();
      }
    }
  };

  const activeOT = ots.find(o => o.trabajoId === selectedOtId);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:max-w-md md:mx-auto md:border-x md:border-border shadow-2xl font-sans">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4">
          <Sparkles size={16} />
          {notification}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-card border-b border-border p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-inner">
              <Wrench size={16} />
            </div>
            <span className="font-black text-base tracking-tight">TallerDesk Tech</span>
          </div>
        </div>
        <UserButton />
      </header>

      <div className="bg-primary/5 border-b border-border p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Operario Técnico</p>
          <p className="font-black text-foreground text-sm">{user?.fullName || "Técnico"}</p>
        </div>
        <div className="flex items-center gap-2">
           <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </span>
          <span className="font-bold text-xs">En Turno</span>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/10">
        {ots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-5 shadow-inner">
              <ShieldCheck size={40} />
            </div>
            <h3 className="font-black text-lg mb-2">¡Todo al día!</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No tienes trabajos pendientes asignados a tu nombre. Relájate o consulta con el Jefe de Taller.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              Tus Tareas Activas
              <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[10px]">{ots.length}</span>
            </h2>

            <div className="space-y-3">
              {ots.map((o) => {
                const isSelected = selectedOtId === o.trabajoId;
                let cardColor = "bg-card border-border hover:border-primary/50";
                let badgeColor = "bg-muted text-muted-foreground";
                let iconColor = "text-muted-foreground";
                
                if (o.trabajoEstado === "EN_PROGRESO") {
                  cardColor = isSelected ? "bg-primary/5 border-primary shadow-sm" : "bg-card border-primary/30";
                  badgeColor = "bg-primary text-primary-foreground";
                  iconColor = "text-primary";
                } else if (o.trabajoEstado === "FINALIZADO") {
                  cardColor = isSelected ? "bg-success/5 border-success shadow-sm" : "bg-card border-success/30 opacity-70";
                  badgeColor = "bg-success text-success-foreground";
                  iconColor = "text-success";
                } else if (isSelected) {
                   cardColor = "bg-card border-primary shadow-sm";
                }

                return (
                  <button
                    key={o.trabajoId}
                    onClick={() => setSelectedOtId(o.trabajoId)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${cardColor}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-sm ${iconColor}`}>
                          <Car size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-foreground">{o.codigo}</span>
                            <span className="bg-background border border-border px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold">
                              {o.patente}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium block mt-0.5">{o.vehiculo}</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className={`transition-transform ${isSelected ? 'rotate-90' : ''} text-muted-foreground`} />
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-1">
                       <span className="text-xs font-bold truncate max-w-[150px]">{o.trabajoTitulo}</span>
                       <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm ${badgeColor}`}>
                        {o.trabajoEstado.replace("_", " ")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeOT && (
          <div className="bg-card border border-border rounded-3xl p-5 space-y-6 shadow-xl animate-in slide-in-from-bottom-4 mt-6">
            
            <div className="border-b border-border/60 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-black text-xl mb-1 text-primary">{activeOT.trabajoTitulo}</h3>
                  <div className="flex gap-2">
                     <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-bold">OT: {activeOT.codigo}</span>
                     <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-bold">{activeOT.patente}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                   <select
                    value={activeOT.trabajoEstado}
                    onChange={(e) => handleUpdateStatus(activeOT.trabajoId, e.target.value as any)}
                    className={`font-black text-xs uppercase tracking-wider rounded-xl px-3 py-2 border shadow-sm focus:outline-none appearance-none cursor-pointer pr-8 bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] ${
                      activeOT.trabajoEstado === "EN_PROGRESO" ? "bg-primary text-primary-foreground border-primary" :
                      activeOT.trabajoEstado === "FINALIZADO" ? "bg-success text-success-foreground border-success" :
                      "bg-background text-foreground border-border"
                    }`}
                    style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`}}
                  >
                    <option value="PENDIENTE" className="bg-background text-foreground">⏸ PENDIENTE</option>
                    <option value="EN_PROGRESO" className="bg-background text-foreground">▶ EN PROGRESO</option>
                    <option value="FINALIZADO" className="bg-background text-foreground">✅ FINALIZADO</option>
                  </select>
                </div>
              </div>

              {activeOT.startedAt && activeOT.estimatedHours ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-background rounded-lg p-2 border border-border/50">
                  <Timer size={14} className="text-blue-500" />
                  <span>Iniciado: {new Date(activeOT.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span className="mx-1">•</span>
                  <span>Est: {activeOT.estimatedHours}h</span>
                </div>
              ) : null}
            </div>

            <div>
              <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-3">
                <Package size={14} /> Repuestos a Instalar
              </span>
              {activeOT.repuestos.length > 0 ? (
                <div className="space-y-2">
                  {activeOT.repuestos.map((rep) => (
                    <div key={rep.id} className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl">
                       <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-sm">
                         {rep.cantidad}x
                       </div>
                       <p className="font-bold text-sm text-foreground">{rep.descripcion}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border bg-background/50 text-center text-xs text-muted-foreground font-medium">
                  No hay repuestos asociados a esta orden.
                </div>
              )}
            </div>

            {activeOT.checklist.length > 0 && (
              <div>
                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Wrench size={14} /> Checklist de Tareas
                </span>
                <div className="space-y-2">
                  {activeOT.checklist.map((item: any) => (
                    <label 
                      key={item.id} 
                      className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                        item.completada 
                          ? 'bg-success/5 border-success/30' 
                          : 'bg-background border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${
                        item.completada ? 'bg-success border-success text-success-foreground' : 'border-muted-foreground/30 bg-transparent'
                      }`}>
                        {item.completada && <ShieldCheck size={14} />}
                      </div>
                      <span className={`font-semibold text-sm transition-all ${item.completada ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.tarea}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeOT.observaciones && (
               <div>
                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-2">
                  <MessageSquare size={14} /> Requerimiento Cliente
                </span>
                <p className="text-sm text-foreground bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20 leading-relaxed font-medium italic">
                  "{activeOT.observaciones}"
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                  onClick={() => handleSimulatePhoto(activeOT.trabajoId)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-background border border-border shadow-sm hover:border-primary/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Camera size={20} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Tomar Foto</span>
              </button>
              
              <Link
                href={`/dashboard/directorio?search=${activeOT.patente}`}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-background border border-border shadow-sm hover:border-primary/50 transition-colors"
              >
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <History size={20} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Historial</span>
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
