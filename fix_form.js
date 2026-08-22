const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/dashboard-client.tsx', 'utf8');

const targetStr = \                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-semibold mb-1">Tipo</label>
                      <select 
                        value={newCostItemType}
                        onChange={(e) => setNewCostItemType(e.target.value as any)}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                      >
                        <option value="MANO_OBRA">Mano de Obra (Servicio)</option>
                        <option value="REPUESTO">Repuesto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold mb-1">Monto (CLP)</label>
                      <input 
                        type="number"
                        placeholder="Ej. 25000"
                        value={newCostItemMonto}
                        onChange={(e) => setNewCostItemMonto(e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold mb-1">Detalle / Nota explicativa</label>
                    <input 
                      type="text"
                      placeholder="Ej. Pastillas de freno delanteras Bosch"
                      value={newCostItemDesc}
                      onChange={(e) => setNewCostItemDesc(e.target.value)}
                      className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                    />
                  </div>\;

const replacement = \                  <div>
                    <label className="block text-[9px] font-semibold mb-1">Tipo</label>
                    <select 
                      value={newCostItemType}
                      onChange={(e) => {
                        setNewCostItemType(e.target.value as any);
                        setNewCostBodegaId("");
                        setNewCostItemDesc("");
                      }}
                      className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary mb-2"
                    >
                      <option value="MANO_OBRA">Mano de Obra (Servicio)</option>
                      <option value="REPUESTO">Repuesto (Independiente)</option>
                      <option value="REPUESTO_BODEGA">Repuesto (Desde Bodega - Descuenta Stock)</option>
                    </select>
                  </div>

                  {newCostItemType === "REPUESTO_BODEGA" ? (
                    <div className="grid grid-cols-[1fr_80px] gap-2">
                      <div>
                        <label className="block text-[9px] font-semibold mb-1">Repuesto en Bodega</label>
                        <select 
                          value={newCostBodegaId}
                          onChange={(e) => setNewCostBodegaId(e.target.value)}
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                        >
                          <option value="">Selecciona un repuesto...</option>
                          {inventarioItems
                            .filter(i => i.tipo === "REPUESTO" && i.cantidad - (i.stockReservado || 0) > 0)
                            .map(i => (
                              <option key={i.id} value={i.id}>
                                {i.nombre} (Disp: {i.cantidad - (i.stockReservado || 0)}) - $\
                              </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold mb-1">Cantidad</label>
                        <input 
                          type="number"
                          min="1"
                          value={newCostCantidad}
                          onChange={(e) => setNewCostCantidad(e.target.value)}
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="col-span-2">
                          <label className="block text-[9px] font-semibold mb-1">Monto (CLP)</label>
                          <input 
                            type="number"
                            placeholder="Ej. 25000"
                            value={newCostItemMonto}
                            onChange={(e) => setNewCostItemMonto(e.target.value)}
                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold mb-1">Detalle / Nota explicativa</label>
                        <input 
                          type="text"
                          placeholder="Ej. Pastillas de freno delanteras Bosch"
                          value={newCostItemDesc}
                          onChange={(e) => setNewCostItemDesc(e.target.value)}
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                        />
                      </div>
                    </>
                  )}\;

if (c.includes(targetStr)) {
  c = c.replace(targetStr, replacement);
  fs.writeFileSync('src/app/dashboard/dashboard-client.tsx', c, 'utf8');
  console.log("Success");
} else {
  console.log("Target string not found in file. Here is the first 1000 chars of file to see if it matches");
}
