"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, UserCheck, Search, Plus, Upload, Trash2, Edit, Save, X, Power, Loader2, Download } from "lucide-react";
import { useSystemAuth } from "@/components/auth-wrapper";
import { getProveedores, createProveedor, deleteProveedor, toggleProveedorActivo, uploadProveedorCatalog } from "@/lib/db-actions";
import * as XLSX from "xlsx";

export default function ProveedoresPage() {
  const { roles } = useSystemAuth();
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProveedor, setNewProveedor] = useState({ nombre: "", telefono: "", ciudad: "", direccion: "" });
  
  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const fetchProveedores = async () => {
    setLoading(true);
    try {
      const data = await getProveedores();
      setProveedores(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createProveedor(newProveedor);
    if (res.success) {
      notify("Proveedor creado exitosamente.");
      setShowCreateModal(false);
      setNewProveedor({ nombre: "", telefono: "", ciudad: "", direccion: "" });
      fetchProveedores();
    } else {
      notify(`Error: ${res.error}`, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro que deseas eliminar este proveedor? Se borrarán todos sus repuestos asociados.")) {
      const res = await deleteProveedor(id);
      if (res.success) {
        notify("Proveedor eliminado.");
        fetchProveedores();
      } else {
        notify(`Error: ${res.error}`, 'error');
      }
    }
  };

  const handleToggle = async (id: string) => {
    const res = await toggleProveedorActivo(id);
    if (res.success) fetchProveedores();
  };

  const triggerUpload = (id: string) => {
    setUploadingFor(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingFor) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Mapeo simple: asume que el excel tiene columnas: SKU, Nombre, Marca, Precio, Stock, Categoria
        const mappedData = data.map((row: any) => ({
          sku: row.SKU || row.sku || null,
          nombre: row.Nombre || row.nombre || row.Producto || row.producto,
          marca: row.Marca || row.marca || null,
          precio: Number(row.Precio || row.precio) || 0,
          stock: Number(row.Stock || row.stock) || 0,
          categoria: row.Categoria || row.categoria || null
        })).filter(r => r.nombre);

        if (mappedData.length === 0) {
          notify("No se encontraron productos válidos en el Excel. Verifica las columnas.", "error");
          setUploadingFor(null);
          return;
        }

        const res = await uploadProveedorCatalog(uploadingFor, mappedData);
        if (res.success) {
          notify(`¡Catálogo actualizado con ${mappedData.length} productos!`);
          fetchProveedores();
        } else {
          notify(`Error al subir catálogo: ${res.error}`, "error");
        }
      } catch (err: any) {
        notify(`Error leyendo archivo: ${err.message}`, "error");
      } finally {
        setUploadingFor(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { SKU: "FIL-001", Nombre: "Filtro de Aceite Toyota Yaris", Marca: "Toyota", Precio: 8500, Stock: 10, Categoria: "Filtros" },
      { SKU: "PAS-002", Nombre: "Pastillas de freno delanteras", Marca: "Bosch", Precio: 25000, Stock: 5, Categoria: "Frenos" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catálogo");
    XLSX.writeFile(wb, "Plantilla_Catalogo_TallerDesk.xlsx");
  };

  if (!roles.includes("SUPER_ADMIN")) {
    return <div className="p-10 text-center">No tienes acceso a esta ruta.</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
      
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 animate-fade-in ${notification.type === 'success' ? 'bg-primary' : 'bg-destructive'}`}>
          {notification.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/super-admin" className="p-2 bg-muted hover:bg-muted/80 rounded-lg">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <UserCheck className="text-primary" /> Directorio B2B
              </h1>
              <p className="text-muted-foreground text-sm">Gestiona proveedores locales y carga sus catálogos.</p>
            </div>
          </div>
          
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Download size={14} /> Plantilla Excel
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Buscar proveedor o ciudad..." 
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-background border border-input text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-full md:w-auto h-10 px-4 bg-primary text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90"
          >
            <Plus size={16} /> Nuevo Proveedor
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-4">Proveedor</th>
                <th className="px-6 py-4">Ciudad</th>
                <th className="px-6 py-4">Contacto (WhatsApp)</th>
                <th className="px-6 py-4">Catálogo Cargado</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    <Loader2 className="animate-spin mx-auto mb-2" /> Cargando proveedores...
                  </td>
                </tr>
              ) : proveedores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No hay proveedores registrados aún.</td>
                </tr>
              ) : (
                proveedores.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold">{p.nombre}</td>
                    <td className="px-6 py-4">{p.ciudad}</td>
                    <td className="px-6 py-4">{p.telefono}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                        {p.items?.length || 0} ítems
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleToggle(p.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${p.activo ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
                      >
                        <Power size={10} /> {p.activo ? "Activo" : "Pausado"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => triggerUpload(p.id)}
                        disabled={uploadingFor === p.id}
                        className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-primary tooltip disabled:opacity-50" 
                        title="Sobrescribir Catálogo Excel"
                      >
                        {uploadingFor === p.id ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="p-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg text-destructive tooltip" 
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Registrar Proveedor</h3>
              <button onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Nombre Tienda</label>
                <input required type="text" value={newProveedor.nombre} onChange={e => setNewProveedor({...newProveedor, nombre: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-background border border-input text-sm" placeholder="Ej: AutoPlanet" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">WhatsApp de Pedidos</label>
                <input required type="text" value={newProveedor.telefono} onChange={e => setNewProveedor({...newProveedor, telefono: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-background border border-input text-sm" placeholder="+56912345678" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Ciudad</label>
                <input required type="text" value={newProveedor.ciudad} onChange={e => setNewProveedor({...newProveedor, ciudad: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-background border border-input text-sm" placeholder="Ej: Talca" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Dirección (Opcional)</label>
                <input type="text" value={newProveedor.direccion} onChange={e => setNewProveedor({...newProveedor, direccion: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-background border border-input text-sm" placeholder="Calle 123" />
              </div>
              <button type="submit" className="w-full h-10 bg-primary text-white font-bold rounded-lg mt-4">
                Guardar Proveedor
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
