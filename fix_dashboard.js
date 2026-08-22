const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/dashboard-client.tsx', 'utf8');

// 1. Update mapping
c = c.replace(/titulo: t\.titulo,/g, 'titulo: t.titulo,\n              estimacionMinutos: t.estimacionMinutos,');

// 2. Update mechanicWorkloads
const workloadOriginal = \  const mechanicWorkloads = dbMecanicos.map(m => {
    const activeOts = ots.filter(o => o.tecnicoId === m.id && o.status !== "ENTREGADO" && o.status !== "LISTO_ENTREGA" && o.status !== "ANULADO").length;
    let statusLabel = "Disponible";
    let statusColor = "text-success bg-success/15";
    if (activeOts >= 3) {
      statusLabel = "Sobrecargado";
      statusColor = "text-red-500 bg-red-500/15";
    } else if (activeOts > 0) {
      statusLabel = "Ocupado";
      statusColor = "text-warning bg-warning/15";
    }
    return { ...m, activeOts, statusLabel, statusColor };
  });\;

const workloadReplacement = \  const mechanicWorkloads = dbMecanicos.map(m => {
    let activeTrabajos = 0;
    let tiempoEstimadoTotal = 0; // en minutos

    ots.forEach(o => {
      if (o.status !== "ENTREGADO" && o.status !== "LISTO_ENTREGA" && o.status !== "ANULADO") {
        const trabajosAsignados = (o.trabajos || []).filter((t: any) => t.tecnicoId === m.id && t.estado !== "FINALIZADO");
        activeTrabajos += trabajosAsignados.length;
        trabajosAsignados.forEach((t: any) => {
          tiempoEstimadoTotal += (t.estimacionMinutos || 0);
        });
      }
    });

    let statusLabel = "Disponible";
    let statusColor = "text-success bg-success/15 text-success-foreground border-success/30";
    if (activeTrabajos >= 3 || tiempoEstimadoTotal > 240) { // More than 4 hours
      statusLabel = "Sobrecargado";
      statusColor = "text-red-600 bg-red-500/15 border-red-500/30";
    } else if (activeTrabajos > 0) {
      statusLabel = "Ocupado";
      statusColor = "text-warning bg-warning/15 border-warning/30";
    }
    
    const estimacionString = tiempoEstimadoTotal > 0 
      ? \\\Aprox. \\\h \\\m\\\
      : "";

    return { ...m, activeOts: activeTrabajos, statusLabel, statusColor, estimacionString };
  });\;

c = c.replace(workloadOriginal, workloadReplacement);

// 3. Update visibility and visual of panel
const panelOriginal = \            {roles.includes("TALLER_RECEP") && (
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-5">
                  <h3 className="font-bold text-sm mb-4 border-b border-border pb-2 flex items-center gap-2">
                    <User size={14} className="text-primary"/>
                    Disponibilidad Mecánicos
                  </h3>
                  <div className="space-y-3">
                    {mechanicWorkloads.map(m => (
                      <div key={m.id} className="flex flex-col gap-1.5 p-3 border border-border rounded-lg bg-muted/10">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs">{m.nombre}</span>
                          <span className={\\\px-2 py-0.5 rounded-full text-[10px] font-bold \\\\\\}>
                            {m.statusLabel}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex justify-between">
                          <span>OTs en curso (No entregadas):</span>
                          <span className="font-bold text-foreground">{m.activeOts}</span>
                        </div>
                      </div>
                    ))}
                    {mechanicWorkloads.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No hay mecánicos registrados.</p>
                    )}
                  </div>
                </div>
              </div>
            )}\;

const panelReplacement = \            {(roles.includes("TALLER_RECEP") || roles.includes("TALLER_ADMIN") || roles.includes("TALLER_JEFE")) && (
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-4">
                  <h3 className="font-bold text-sm mb-4 border-b border-border/50 pb-2 flex items-center gap-2">
                    <User size={15} className="text-primary"/>
                    Disponibilidad Mecánicos
                  </h3>
                  <div className="space-y-3">
                    {mechanicWorkloads.map(m => (
                      <div key={m.id} className="flex flex-col gap-2 p-3 border border-border/60 rounded-xl bg-muted/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs truncate max-w-[120px]" title={m.nombre}>{m.nombre}</span>
                          <span className={\\\px-2 py-0.5 rounded-full text-[9px] font-bold border \\\\\\}>
                            {m.statusLabel}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="text-[10px] text-muted-foreground flex justify-between items-center">
                            <span>Trabajos en curso:</span>
                            <span className="font-bold text-foreground text-[11px] bg-background border border-border/50 px-1.5 py-0.5 rounded-md">{m.activeOts}</span>
                          </div>
                          {m.estimacionString && (
                            <div className="text-[10px] text-primary flex justify-between items-center">
                              <span>Tiempo Ocupado:</span>
                              <span className="font-extrabold">{m.estimacionString}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {mechanicWorkloads.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No hay mecánicos registrados.</p>
                    )}
                  </div>
                </div>
              </div>
            )}\;

c = c.replace(panelOriginal, panelReplacement);

// 4. Update newTrabajoData state and create action
c = c.replace(/const \[newTrabajoData, setNewTrabajoData\] = useState\(\{titulo: "", tareas: \[\] as string\[\]\}\);/, 'const [newTrabajoData, setNewTrabajoData] = useState({titulo: "", estimacionMinutos: 0, tareas: [] as string[]});');

c = c.replace(/const handleCreateTrabajo = async \(otId: string, titulo: string, tareas: string\[\]\) => \{/, 'const handleCreateTrabajo = async (otId: string, titulo: string, tareas: string[], estimacionMinutos?: number) => {');
c = c.replace(/const res = await createTrabajoOT\(otId, titulo, undefined, tareas\);/, 'const res = await createTrabajoOT(otId, titulo, undefined, tareas, estimacionMinutos);');

// 5. Update UI for create Trabajo modal
const modalOriginal = \              <div>
                <label className="block text-xs font-semibold mb-1">Título del Trabajo</label>
                <input
                  type="text"
                  value={newTrabajoData.titulo}
                  onChange={(e) => setNewTrabajoData({...newTrabajoData, titulo: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:border-primary"
                  placeholder="Ej: Cambio de Aceite, Frenos..."
                />
              </div>\;

const modalReplacement = \              <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Título del Trabajo</label>
                  <input
                    type="text"
                    value={newTrabajoData.titulo}
                    onChange={(e) => setNewTrabajoData({...newTrabajoData, titulo: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:border-primary"
                    placeholder="Ej: Cambio de Aceite, Frenos..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Tiempo (Minutos)</label>
                  <input
                    type="number"
                    min="0"
                    step="15"
                    value={newTrabajoData.estimacionMinutos || ""}
                    onChange={(e) => setNewTrabajoData({...newTrabajoData, estimacionMinutos: parseInt(e.target.value) || 0})}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:border-primary"
                    placeholder="Ej: 60"
                  />
                </div>
              </div>\;

c = c.replace(modalOriginal, modalReplacement);

// 6. Update handleCreateTrabajo call
c = c.replace(/handleCreateTrabajo\(createTrabajoModal\.otId, newTrabajoData\.titulo, newTrabajoData\.tareas\.filter\(t => t\.trim\(\) !== ""\)\)/g, 'handleCreateTrabajo(createTrabajoModal.otId, newTrabajoData.titulo, newTrabajoData.tareas.filter(t => t.trim() !== ""), newTrabajoData.estimacionMinutos)');

fs.writeFileSync('src/app/dashboard/dashboard-client.tsx', c, 'utf8');
console.log("Success");
