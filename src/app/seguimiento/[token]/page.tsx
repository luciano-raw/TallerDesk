"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Wrench, 
  Car, 
  CheckCircle2, 
  Clock, 
  Camera, 
  MessageSquare, 
  ShieldCheck, 
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Sparkles
} from "lucide-react";
import { getOTByToken, updateTrabajoAdicionalEstado } from "@/lib/db-actions";

// Estructura de datos simulada para la OT de seguimiento del cliente
interface ClienteOT {
  codigo: string;
  patente: string;
  vehiculo: string;
  cliente: string;
  status: "INGRESADO" | "DIAGNOSTICO" | "PRESUPUESTADO" | "EN_PROGRESO" | "CONTROL_CALIDAD" | "LISTO_ENTREGA" | "ENTREGADO";
  combustible: number;
  costoManoObra: number;
  costoRepuestos: number;
  trabajosAdicionales: {
    id: string;
    detalle: string;
    monto: number;
    estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  }[];
  trabajos: {
    titulo: string;
    estado: "PENDIENTE" | "EN_PROGRESO" | "FINALIZADO";
    tareas?: { id: string; tarea: string; completada: boolean }[];
  }[];
  fotos: { url: string; descripcion: string; fecha: string }[];
  comentariosTaller: string[];
  bitacora: { id: string; accion: string; usuarioNombre: string; createdAt: string }[];
}

const initialClienteOT: ClienteOT = {
  codigo: "OT-1021",
  patente: "AB-CD-12",
  vehiculo: "Suzuki Swift 2021 (1.2L)",
  cliente: "Claudio Morales",
  status: "EN_PROGRESO",
  combustible: 45,
  costoManoObra: 45000,
  costoRepuestos: 25000,
  trabajosAdicionales: [
    {
      id: "ad_1",
      detalle: "Pastillas de freno delanteras desgastadas (bajo el límite de seguridad de 2mm). Requiere cambio inmediato.",
      monto: 35000,
      estado: "PENDIENTE"
    }
  ],
  trabajos: [
    { titulo: "Revisión general", estado: "FINALIZADO" },
    { titulo: "Cambio de pastillas", estado: "EN_PROGRESO" }
  ],
  fotos: [
    { url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=350", descripcion: "Desgaste severo en pastilla de freno delantera izquierda", fecha: "Hoy, 10:35 AM" }
  ],
  comentariosTaller: [
    "Vehículo ingresado para mantención de 40.000 km.",
    "Se detecta chillido al frenar. Se desmontaron ruedas y se corroboró desgaste crítico de pastillas."
  ],
  bitacora: []
};

export default function ClienteSeguimientoPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [ot, setOt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchOTData = () => {
    if (token) {
      getOTByToken(token).then((data) => {
        if (data) {
          const dbOt = {
            id: data.id,
            codigo: data.codigo,
            patente: data.vehiculo.patente,
            vehiculo: `${data.vehiculo.marca} ${data.vehiculo.modelo}`,
            cliente: data.vehiculo.cliente.nombre,
            tallerNombre: data.taller.nombre,
            status: data.status,
            combustible: data.combustible,
            costoManoObra: data.costoManoObra,
            costoRepuestos: data.itemsPresupuesto
              .filter((i: any) => i.tipo === "REPUESTO")
              .reduce((acc: number, curr: any) => acc + curr.monto, 0),
            trabajosAdicionales: data.trabajosAdicionales ? data.trabajosAdicionales.map((ta: any) => ({
              id: ta.id,
              detalle: ta.descripcion,
              monto: ta.monto,
              estado: ta.estadoAprobacion
            })) : [],
            trabajos: data.trabajos ? data.trabajos.map((t: any) => ({
              titulo: t.titulo,
              estado: t.estado,
              tareas: t.tareas || []
            })) : [],
            fotos: data.fotos,
            comentariosTaller: data.diagnostico ? [
              `Requerimiento inicial: ${data.observaciones}`,
              `Diagnóstico del técnico: ${data.diagnostico}`
            ] : [`Requerimiento inicial: ${data.observaciones}`],
            bitacora: data.bitacora || []
          };
          setOt(dbOt);
        }
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchOTData();
  }, [token]);

  const handleAprobarPresupuesto = async (adicionalId: string) => {
    const res = await updateTrabajoAdicionalEstado(adicionalId, "APROBADO");
    if (res.success) {
      triggerNotification("🟢 Trabajo adicional APROBADO. Informando al taller.");
      fetchOTData();
    } else {
      triggerNotification("❌ Error al aprobar el presupuesto.");
    }
  };

  const handleRechazarPresupuesto = async (adicionalId: string) => {
    const res = await updateTrabajoAdicionalEstado(adicionalId, "RECHAZADO");
    if (res.success) {
      triggerNotification("🔴 Trabajo adicional RECHAZADO. Se mantendrá el trabajo original.");
      fetchOTData();
    } else {
      triggerNotification("❌ Error al rechazar el presupuesto.");
    }
  };

  // Listado de estados y si están completados
  const estadosOrder: { value: ClienteOT["status"]; label: string; desc: string }[] = [
    { value: "INGRESADO", label: "Ingresado", desc: "Vehículo recibido e inspeccionado visualmente" },
    { value: "DIAGNOSTICO", label: "Diagnóstico", desc: "Evaluando sistemas y verificando requerimientos" },
    { value: "PRESUPUESTADO", label: "Presupuestado", desc: "Presupuesto detallado enviado al cliente" },
    { value: "EN_PROGRESO", label: "En Trabajo", desc: "Mecánicos ejecutando reparaciones y servicios" },
    { value: "CONTROL_CALIDAD", label: "Control de Calidad", desc: "Pruebas de ruta y escaneo final de seguridad" },
    { value: "LISTO_ENTREGA", label: "Listo para Entrega", desc: "Auto lavado y esperando retiro" },
    { value: "ENTREGADO", label: "Entregado", desc: "Vehículo entregado conforme. ¡Gracias por tu confianza!" }
  ];

  const getStatusIndex = (current: ClienteOT["status"]) => {
    return estadosOrder.findIndex(e => e.value === current);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center text-foreground">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-muted-foreground">Cargando portal de seguimiento...</p>
      </div>
    );
  }

  if (!ot) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center text-foreground">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-6">
          <Wrench size={32} />
        </div>
        <h1 className="text-xl font-bold mb-2">Orden de Trabajo no Encontrada</h1>
        <p className="text-xs text-muted-foreground max-w-xs mb-6 leading-relaxed">
          No pudimos encontrar ninguna orden de trabajo con el token ingresado o el enlace ha caducado.
        </p>
      </div>
    );
  }

  const currentIdx = getStatusIndex(ot.status);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:max-w-md md:mx-auto md:border-x md:border-border md:shadow-2xl">
      {/* NOTIFICACION */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 animate-fade-in text-center">
          <Sparkles size={14} />
          {notification}
        </div>
      )}

      {/* HEADER DE CLIENTE */}
      <header className="sticky top-0 z-40 bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center glow-green">
            <Car size={16} />
          </div>
          <div>
            <h1 className="font-bold text-xs">Seguimiento de Vehículo</h1>
            <p className="text-[10px] text-muted-foreground">{ot.tallerNombre}</p>
          </div>
        </div>
        <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          {ot.codigo}
        </span>
      </header>

      {/* INFO PRINCIPAL DEL AUTO */}
      <div className="bg-gradient-to-br from-primary/10 to-emerald-500/5 border-b border-border p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Vehículo</span>
            <h2 className="font-bold text-sm text-foreground">{ot.vehiculo}</h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Patente / Placa</span>
            <p className="bg-primary text-white text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider mt-0.5 glow-green-sm">
              {ot.patente}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4 text-[10px] border-t border-border/40 pt-3">
          <div>
            <span className="text-muted-foreground">Estado Actual:</span>
            <p className="font-bold text-primary mt-0.5 capitalize">{ot.status.replace("_", " ").toLowerCase()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Combustible al Ingreso:</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden border border-border">
                <div className="bg-primary h-full" style={{ width: `${ot.combustible}%` }}></div>
              </div>
              <span className="font-bold text-foreground">{ot.combustible}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        {/* INTERACCION DE PRESUPUESTO ADICIONAL */}
        {ot.trabajosAdicionales && ot.trabajosAdicionales.map((ta: any) => (
          <div key={ta.id} className="bg-card border border-border rounded-xl p-4 glow-green-sm space-y-3.5">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <HelpCircle size={16} className="text-yellow-500" />
              <h3 className="font-bold text-xs text-yellow-500">¿Aprobar Trabajo Adicional?</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {ta.detalle}
            </p>

            <div className="flex items-center justify-between py-1 border-y border-border/40 my-2">
              <span className="text-[10px] text-muted-foreground">Costo de Reparación Adicional:</span>
              <span className="font-extrabold text-sm text-primary">${ta.monto.toLocaleString("es-CL")} CLP</span>
            </div>

            {ta.estado === "PENDIENTE_APROBACION" ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => handleRechazarPresupuesto(ta.id)}
                  className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-muted-foreground transition-all"
                >
                  <ThumbsDown size={13} />
                  Rechazar
                </button>
                <button
                  onClick={() => handleAprobarPresupuesto(ta.id)}
                  className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-bold transition-all glow-green-sm"
                >
                  <ThumbsUp size={13} />
                  Aprobar
                </button>
              </div>
            ) : (
              <div className={`p-2.5 rounded-lg text-center text-xs font-bold ${
                ta.estado === "APROBADO"
                  ? "bg-success/10 border border-success/30 text-success"
                  : "bg-destructive/10 border border-destructive/30 text-destructive"
              }`}>
                {ta.estado === "APROBADO" 
                  ? "✓ Presupuesto Aceptado. Trabajo agendado." 
                  : "✗ Presupuesto Rechazado. No se realizará esta reparación."
                }
              </div>
            )}
          </div>
        ))}

        {/* TIMELINE DE PROGRESO */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Clock size={14} className="text-primary" />
            Progreso del Servicio
          </h3>

          <div className="relative border-l border-border ml-2.5 pl-4 space-y-6">
            {estadosOrder.map((est, idx) => {
              const isCompleted = idx < currentIdx;
              const isActive = idx === currentIdx;
              
              return (
                <div key={est.value} className="relative">
                  {/* Círculo de Estado */}
                  <span className={`absolute -left-[22px] top-0.5 w-3 h-3 rounded-full border transition-all ${
                    isCompleted 
                      ? "bg-success border-success text-white" 
                      : isActive 
                      ? "bg-primary border-primary animate-pulse" 
                      : "bg-background border-border"
                  }`} />
                  
                  <div>
                    <h4 className={`text-xs font-bold leading-none transition-colors ${
                      isActive ? "text-primary text-sm" : isCompleted ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {est.label}
                    </h4>
                    {(isActive || isCompleted) && (
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                        {est.desc}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {ot.trabajos && ot.trabajos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Desglose de Trabajos Asignados</h4>
              <div className="space-y-1.5">
                {ot.trabajos.map((t: any, i: number) => {
                  const totalTareas = t.tareas ? t.tareas.length : 0;
                  const completadas = t.tareas ? t.tareas.filter((ta: any) => ta.completada).length : 0;
                  const progress = totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : (t.estado === "FINALIZADO" ? 100 : 0);
                  
                  return (
                    <div key={i} className="flex flex-col text-xs bg-muted/20 p-3 rounded-lg border border-border/50 gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{t.titulo}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${t.estado === "FINALIZADO" ? "bg-success/10 text-success" : t.estado === "EN_PROGRESO" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"}`}>
                          {t.estado.replace("_", " ")}
                        </span>
                      </div>
                      
                      {t.estado === "EN_PROGRESO" && t.tecnico && t.startedAt && (
                        <div className="bg-primary/5 text-primary p-2 rounded flex flex-col gap-1 text-[10px] border border-primary/20">
                          <span className="font-bold flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            Siendo atendido por {t.tecnico.nombre}
                          </span>
                          {(() => {
                            const elapsedMins = Math.floor((Date.now() - new Date(t.startedAt).getTime()) / 60000);
                            const minsRestantes = Math.max(0, (t.estimacionMinutos || 0) - elapsedMins);
                            if (minsRestantes > 0) {
                              const freeTimeDate = new Date(Date.now() + minsRestantes * 60000);
                              const timeStr = freeTimeDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                              return <span className="opacity-80">Finaliza aprox. a las {timeStr}</span>;
                            }
                            return <span className="opacity-80">Finalizando pronto...</span>;
                          })()}
                        </div>
                      )}
                      
                      {totalTareas > 0 && (
                        <div className="space-y-1 mt-1 border-t border-border/40 pt-2">
                          <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                            <span>Progreso de tareas</span>
                            <span>{completadas}/{totalTareas} ({progress}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
                            <div 
                              className={`h-full transition-all duration-500 ${progress === 100 ? "bg-success" : "bg-primary"}`} 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          
                          <div className="mt-2 space-y-1">
                            {t.tareas.map((tarea: any, j: number) => (
                              <div key={j} className="flex items-center gap-1.5 text-[10px]">
                                {tarea.completada ? (
                                  <CheckCircle2 size={12} className="text-success shrink-0" />
                                ) : (
                                  <div className="w-3 h-3 rounded-full border border-muted-foreground/40 shrink-0" />
                                )}
                                <span className={tarea.completada ? "line-through text-muted-foreground" : "text-foreground"}>
                                  {tarea.tarea}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

{/* Fotografias ocultas temporalmente */}
        {/* BITACORA DEL TALLER */}
        {ot.comentariosTaller.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare size={14} className="text-primary" />
              Notas de la Recepción
            </h3>

            <div className="space-y-2">
              {ot.comentariosTaller.map((nota: string, i: number) => (
                <div key={i} className="p-3 bg-muted/30 border border-border/70 rounded-lg text-xs leading-relaxed text-muted-foreground">
                  {nota}
                </div>
              ))}
            </div>
          </div>
        )}

        {ot.bitacora && ot.bitacora.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 mt-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare size={14} className="text-primary" />
              Historial de Acciones (Bitácora)
            </h3>
            <div className="space-y-2">
              {ot.bitacora.map((b: any) => (
                <div key={b.id} className="p-2 border-b border-border/40 text-xs">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold">{b.usuarioNombre || "Sistema"}</span>
                    <span className="text-[9px] text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{b.accion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COSTOS RESUMEN */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground">Servicios / Mano de Obra:</span>
            <span className="font-semibold text-foreground">${ot.costoManoObra.toLocaleString("es-CL")}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground">Repuestos Utilizados:</span>
            <span className="font-semibold text-foreground">${ot.costoRepuestos.toLocaleString("es-CL")}</span>
          </div>
          <div className="flex justify-between py-1 text-sm font-bold text-primary pt-1">
            <span>Costo Total Presupuestado:</span>
            <span>${(ot.costoManoObra + ot.costoRepuestos).toLocaleString("es-CL")} CLP</span>
          </div>
        </div>
      </div>

      {/* PIE DE PORTAL */}
      <footer className="py-6 text-center text-[10px] text-muted-foreground bg-card/50 border-t border-border flex items-center justify-center gap-1">
        <ShieldCheck size={12} className="text-primary" />
        <span>Conexión Encriptada Segura - TallerDesk SaaS</span>
      </footer>
    </div>
  );
}
