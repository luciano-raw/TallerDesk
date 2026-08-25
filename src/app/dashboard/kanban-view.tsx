import React from "react";
import { Clock, CheckCircle2, AlertCircle, Wrench, FileText, Car, CheckSquare } from "lucide-react";

export function KanbanView({ ots, onSelectOT }: { ots: any[], onSelectOT: (ot: any) => void }) {
  const columns = [
    { id: "INGRESADO", label: "Ingresados", icon: Car, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { id: "DIAGNOSTICO", label: "En Diagnóstico", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { id: "PRESUPUESTADO", label: "Presupuestados", icon: FileText, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { id: "EN_PROGRESO", label: "En Progreso", icon: Wrench, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    { id: "CONTROL_CALIDAD", label: "Control Calidad", icon: CheckSquare, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20" },
    { id: "LISTO_ENTREGA", label: "Listo para Entrega", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  ];

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden h-[calc(100vh-140px)] flex flex-col">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
        <h2 className="font-bold text-base flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          Vista Operacional (Kanban)
        </h2>
        <span className="text-xs text-muted-foreground">Visión integral del estado del taller</span>
      </div>
      
      <div className="flex-1 overflow-x-auto p-4 bg-muted/10">
        <div className="flex gap-4 h-ull min-w-max pb-2">
          {columns.map(col => {
            const columnOts = ots.filter(o => o.status === col.id);
            const Icon = col.icon;
            
            return (
              <div key={col.id} className={`w-[280px] flex flex-col rounded-xl border ${col.border} bg-background/50 overflow-hidden shadow-sm`}>
                <div className={`p-3 ${col.bg} border-b ${col.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${col.color}`} />
                    <span className={`font-bold text-xs ${col.color}`}>{col.label}</span>
                  </div>
                  <span className="bg-background text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full border border-border">
                    {columnOts.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                  {columnOts.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground text-center p-4 border border-dashed border-border rounded-lg">
                      No hay OTs en esta etapa
                    </div>
                  ) : (
                    columnOts.map(ot => (
                      <div 
                        key={ot.id} 
                        onClick={() => onSelectOT(ot)}
                        className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-black text-primary text-xs group-hover:underline">{ot.codigo}</span>
                          <span className="text-[9px] font-mono bg-muted px-1 rounded text-muted-foreground">{ot.patente}</span>
                        </div>
                        <div className="font-bold text-[11px] leading-tight mb-1">{ot.vehiculo}</div>
                        <div className="text-[10px] text-muted-foreground truncate mb-2">{ot.cliente}</div>
                        
                        {(ot.trabajos && ot.trabajos.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
                            {ot.trabajos.map((t: any) => (
                              <div 
                                key={t.id} 
                                className={`w-1.5 h-1.5 rounded-full ${
                                  t.estado === "FINALIZADO" ? "bg-success" : 
                                  t.estado === "EN_PROGRESO" ? "bg-warning" : "bg-muted-foreground/30"
                                }`} 
                                title={t.titulo}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
