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
  Clock, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown,
  ArrowLeft,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { 
  getTecnicoOTs, 
  toggleTareaChecklist, 
  updateOTDiagnostico, 
  addOTFoto, 
  updateOTStatus 
} from "@/lib/db-actions";

interface TecnicoOT {
  id: string;
  codigo: string;
  patente: string;
  vehiculo: string;
  observaciones: string;
  status: "DIAGNOSTICO" | "EN_PROGRESO" | "CONTROL_CALIDAD" | "LISTO_ENTREGA";
  checklist: { id: string; tarea: string; completada: boolean }[];
  fotos: { url: string; descripcion: string; fecha: string }[];
  notasMecanico: string[];
}
const initialTecnicoOTs: TecnicoOT[] = [];

export default function TecnicoClient({ initialDbUser }: { initialDbUser?: any }) {
  const { role, user, isDemoMode } = useSystemAuth();
  const [ots, setOts] = useState<any[]>([]);
  const [selectedOtId, setSelectedOtId] = useState<string | null>(null);
  const [nuevaNota, setNuevaNota] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const loadDbOTs = async () => {
    const tecnicoId = initialDbUser?.id || user?.id;
    if (tecnicoId) {
      const dbOts = await getTecnicoOTs(tecnicoId);
      const mapped = dbOts.map((o: any) => ({
        id: o.id,
        codigo: o.codigo,
        patente: o.vehiculo.patente,
        vehiculo: `${o.vehiculo.marca} ${o.vehiculo.modelo}`,
        observaciones: o.observaciones || "",
        status: o.status,
        checklist: o.checklist.map((c: any) => ({
          id: c.id,
          tarea: c.tarea,
          completada: c.completada
        })),
        fotos: o.fotos.map((f: any) => ({
          url: f.url,
          descripcion: f.descripcion || "",
          fecha: new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })),
        notasMecanico: o.diagnostico ? [o.diagnostico] : []
      }));
      setOts(mapped);
      
      // Mantener seleccionada la OT activa o seleccionar la primera
      if (mapped.length > 0) {
        if (!selectedOtId || !mapped.some(o => o.id === selectedOtId)) {
          setSelectedOtId(mapped[0].id);
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

  if (role !== "TALLER_TECNICO" && role !== "TALLER_ADMIN") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-6">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Esta vista móvil está adaptada exclusivamente para los **Mecánicos / Técnicos** dentro del taller. Tu rol actual es <span className="font-semibold text-primary capitalize">{role.replace("TALLER_", "").toLowerCase()}</span>.
        </p>
      </div>
    );
  }

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleChecklist = async (otId: string, itemId: string) => {
    let nextState = false;
    const nextOts = ots.map(o => {
      if (o.id === otId) {
        const nextChecklist = o.checklist.map((item: any) => {
          if (item.id === itemId) {
            nextState = !item.completada;
            return { ...item, completada: nextState };
          }
          return item;
        });
        return { ...o, checklist: nextChecklist };
      }
      return o;
    });

    setOts(nextOts);

    if (!isDemoMode) {
      const res = await toggleTareaChecklist(itemId, nextState);
      if (res.success) {
        triggerNotification("Checklist guardado en Supabase.");
        loadDbOTs();
      } else {
        triggerNotification(`Error: ${res.error}`);
      }
    } else {
      triggerNotification("Checklist actualizado.");
    }
  };

  const handleAddNota = async (otId: string) => {
    if (!nuevaNota.trim()) return;

    if (!isDemoMode) {
      const res = await updateOTDiagnostico(otId, nuevaNota);
      if (res.success) {
        triggerNotification("Diagnóstico guardado en Supabase.");
        setNuevaNota("");
        loadDbOTs();
      } else {
        triggerNotification(`Error: ${res.error}`);
      }
    } else {
      setOts(ots.map(o => {
        if (o.id === otId) {
          return { ...o, notasMecanico: [...(o.notasMecanico || []), nuevaNota] };
        }
        return o;
      }));
      setNuevaNota("");
      triggerNotification("Nota guardada en la bitácora.");
    }
  };

  const handleUpdateStatus = async (otId: string, newStatus: any) => {
    const nextOts = ots.map(o => {
      if (o.id === otId) {
        return { ...o, status: newStatus };
      }
      return o;
    });
    setOts(nextOts);

    if (!isDemoMode) {
      const res = await updateOTStatus(otId, newStatus);
      if (res.success) {
        triggerNotification(`Estado de OT cambiado a ${newStatus} en Supabase.`);
        loadDbOTs();
      } else {
        triggerNotification(`Error: ${res.error}`);
      }
    } else {
      triggerNotification(`Estado de OT actualizado a ${newStatus}.`);
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
        triggerNotification("📸 Avance fotográfico guardado en Supabase.");
        loadDbOTs();
      } else {
        triggerNotification(`Error: ${res.error}`);
      }
    } else {
      const nuevaFoto = {
        url: photoUrl,
        descripcion: description,
        fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setOts(ots.map(o => {
        if (o.id === otId) {
          return { ...o, fotos: [...o.fotos, nuevaFoto] };
        }
        return o;
      }));
      triggerNotification("📸 Foto cargada al portal de cliente.");
    }
  };

  const activeOT = ots.find(o => o.id === selectedOtId);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:max-w-md md:mx-auto md:border-x md:border-border md:shadow-2xl">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Sparkles size={14} />
          {notification}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="p-1 rounded-md hover:bg-muted text-muted-foreground">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center glow-green">
              <Wrench size={14} />
            </div>
            <span className="font-bold text-sm">TallerDesk Tech</span>
          </div>
        </div>

        <UserButton />
      </header>

      <div className="bg-primary/5 border-b border-border p-4 flex items-center justify-between">
        <div className="text-xs">
          <p className="text-muted-foreground">Operario Técnico:</p>
          <p className="font-bold text-foreground">{user?.fullName || "Técnico"}</p>
        </div>
        <span className="bg-success/15 border border-success/30 text-success text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          En Taller
        </span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {ots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <ShieldCheck size={32} />
            </div>
            <h3 className="font-bold text-sm">Sin trabajos asignados</h3>
            <p className="text-xs text-muted-foreground max-w-[240px] mt-1.5 leading-relaxed">
              No tienes órdenes de trabajo asignadas a tu nombre en este momento. Las órdenes aparecerán aquí tan pronto como sean vinculadas por un recepcionista.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
              Mis Trabajos Asignados ({ots.length})
            </h2>

            <div className="space-y-2.5">
              {ots.map((o) => {
                const isSelected = selectedOtId === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOtId(o.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected 
                        ? "bg-card border-primary shadow-sm" 
                        : "bg-card/50 border-border hover:bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        <Car size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground">{o.codigo}</span>
                          <span className="bg-muted px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider font-semibold">
                            {o.patente}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">{o.vehiculo}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        o.status === "EN_PROGRESO" 
                          ? "bg-primary/10 text-primary" 
                          : o.status === "CONTROL_CALIDAD" 
                          ? "bg-yellow-500/10 text-yellow-500" 
                          : "bg-success/10 text-success"
                      }`}>
                        {o.status.replace("_", " ")}
                      </span>
                      {isSelected ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeOT && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-5 animate-scale-in">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm">{activeOT.codigo} - {activeOT.patente}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{activeOT.vehiculo}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground">Actualizar Estado:</span>
                <select
                  value={activeOT.status}
                  onChange={(e) => handleUpdateStatus(activeOT.id, e.target.value as any)}
                  className="bg-background border border-border rounded px-2 py-0.5 text-[10px] font-bold focus:outline-none focus:border-primary mt-1"
                >
                  <option value="DIAGNOSTICO">DIAGNÓSTICO</option>
                  <option value="EN_PROGRESO">EN PROGRESO</option>
                  <option value="CONTROL_CALIDAD">C. CALIDAD</option>
                  <option value="LISTO_ENTREGA">LISTO ENTREGA</option>
                </select>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Requerimiento Inicial:</span>
              <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg border border-border leading-relaxed">
                {activeOT.observaciones}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Checklist de Tareas:</span>
              <div className="space-y-1.5">
                {activeOT.checklist.map((item: any) => (
                  <label 
                    key={item.id} 
                    className="flex items-center gap-2.5 p-2 bg-muted/20 border border-border/55 rounded-lg text-xs hover:bg-muted/30 cursor-pointer"
                  >
                    <input 
                      type="checkbox" 
                      checked={item.completada}
                      onChange={() => handleToggleChecklist(activeOT.id, item.id)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className={item.completada ? "line-through text-muted-foreground" : "text-foreground font-medium"}>
                      {item.tarea}
                    </span>
                  </label>
                ))}
              </div>
            </div>

{/* Fotos de Avance ocultas temporalmente */}

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Bitácora / Notas del Servicio:</span>
              
              {activeOT.notasMecanico && activeOT.notasMecanico.length > 0 && (
                <div className="space-y-1.5">
                  {activeOT.notasMecanico.map((n: string, i: number) => (
                    <div key={i} className="flex gap-2 p-2 bg-primary/5 rounded-lg border border-primary/10 text-xs">
                      <MessageSquare size={12} className="text-primary shrink-0 mt-0.5" />
                      <p className="leading-relaxed text-muted-foreground">{n}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Agregar nota al cliente..." 
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  className="flex-1 h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => handleAddNota(activeOT.id)}
                  className="h-8 px-3 rounded-lg bg-muted hover:bg-muted/80 text-xs font-bold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
