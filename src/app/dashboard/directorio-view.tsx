"use client";

import { useState } from "react";
import { Search, Car, User, FileText, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { searchDirectorio, getVehiculoHistory, addRecomendacion } from "@/lib/db-actions";

export default function DirectorioView({ tallerId }: { tallerId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ clientes: any[]; vehiculos: any[] }>({ clientes: [], vehiculos: [] });
  const [loading, setLoading] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await searchDirectorio(tallerId, query);
    if (res.success) {
      setResults({ clientes: res.clientes || [], vehiculos: res.vehiculos || [] });
      setSelectedVehiculo(null);
    }
    setLoading(false);
  };

  const handleSelectVehiculo = async (id: string) => {
    setLoadingHistory(true);
    const res = await getVehiculoHistory(id);
    if (res.success) {
      setSelectedVehiculo(res.vehiculo);
    }
    setLoadingHistory(false);
  };

  const handleAddRec = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const desc = fd.get("descripcion") as string;
    if (!desc) return;
    
    await addRecomendacion(selectedVehiculo.id, desc);
    handleSelectVehiculo(selectedVehiculo.id); // refresh
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold tracking-tight">Directorio e Historial</h2>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Buscar por Patente, RUT o Nombre..." 
            className="flex-1 px-4 py-2 bg-background border border-border rounded-xl text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all"
            disabled={loading}
          >
            <Search size={16} />
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          {results.vehiculos.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Vehículos ({results.vehiculos.length})</h3>
              <div className="space-y-2">
                {results.vehiculos.map(v => (
                  <button 
                    key={v.id} 
                    onClick={() => handleSelectVehiculo(v.id)}
                    className="w-full text-left p-3 rounded-xl hover:bg-muted transition-all border border-transparent hover:border-border flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold">{v.patente}</p>
                      <p className="text-xs text-muted-foreground">{v.marca} {v.modelo}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.clientes.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Clientes ({results.clientes.length})</h3>
              <div className="space-y-2">
                {results.clientes.map(c => (
                  <div key={c.id} className="p-3 rounded-xl border border-border bg-background">
                    <p className="font-bold">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground mb-2">RUT: {c.rutDni}</p>
                    {c.vehiculos?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-[10px] uppercase text-muted-foreground mb-1">Vehículos</p>
                        {c.vehiculos.map((v: any) => (
                          <button 
                            key={v.id}
                            onClick={() => handleSelectVehiculo(v.id)}
                            className="text-xs text-primary hover:underline block"
                          >
                            {v.patente} - {v.marca}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          {loadingHistory ? (
            <div className="bg-card border border-border rounded-2xl p-8 flex items-center justify-center min-h-[300px]">
              <p className="text-muted-foreground flex items-center gap-2">
                <Search className="animate-spin" size={16} /> Cargando historial...
              </p>
            </div>
          ) : selectedVehiculo ? (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-8">
              <div className="flex items-start justify-between border-b border-border pb-6">
                <div>
                  <h2 className="text-2xl font-black">{selectedVehiculo.patente}</h2>
                  <p className="text-muted-foreground">{selectedVehiculo.marca} {selectedVehiculo.modelo} ({selectedVehiculo.anio})</p>
                  <div className="mt-4 flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User size={14} /> {selectedVehiculo.cliente.nombre}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText size={14} /> {selectedVehiculo.cliente.rutDni}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-muted-foreground tracking-wider mb-1">KM Actual</p>
                  <p className="font-mono font-bold text-lg">{Number(selectedVehiculo.kilometraje || 0).toLocaleString()} km</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Car size={18} className="text-primary"/> Historial de Visitas (OTs)</h3>
                {selectedVehiculo.ots?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay órdenes de trabajo registradas.</p>
                ) : (
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {selectedVehiculo.ots.map((ot: any) => (
                      <div key={ot.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-background bg-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-border bg-background shadow-sm hover:border-primary/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-primary">{ot.codigo}</span>
                            <span className="text-xs text-muted-foreground">{new Date(ot.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{ot.observaciones || "Sin observaciones iniciales"}</p>
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="bg-muted px-2 py-1 rounded-md">KM: {Number(ot.kilometraje || 0).toLocaleString()}</span>
                            <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded-md">
                              ${Number(ot.costoTotal).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><AlertCircle size={18} className="text-amber-500"/> Recomendaciones Pendientes</h3>
                <div className="space-y-3 mb-4">
                  {selectedVehiculo.recomendaciones?.filter((r: any) => r.estado === "PENDIENTE").map((rec: any) => (
                    <div key={rec.id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
                      <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{rec.descripcion}</p>
                        <p className="text-xs text-muted-foreground mt-1">Registrado el {new Date(rec.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {selectedVehiculo.recomendaciones?.filter((r: any) => r.estado === "PENDIENTE").length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No hay recomendaciones pendientes.</p>
                  )}
                </div>
                
                <form onSubmit={handleAddRec} className="flex gap-2">
                  <input type="text" name="descripcion" placeholder="Nueva sugerencia (ej. Cambio de aceite en 5.000km)" className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg" required />
                  <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold">Añadir</button>
                </form>
              </div>

            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                <Car size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2">Historial de Vehículos</h3>
              <p className="text-muted-foreground max-w-sm">Busca una patente, RUT o nombre de cliente para ver su ficha permanente y el historial completo de visitas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
