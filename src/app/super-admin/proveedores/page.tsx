"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, UserCheck, Search, Plus, Upload, Trash2, Edit } from "lucide-react";
import { useSystemAuth } from "@/components/auth-wrapper";

export default function ProveedoresPage() {
  const { roles } = useSystemAuth();
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aquí iría el fetch de proveedores a db-actions.ts
    // Por ahora lo simularemos.
    setTimeout(() => {
      setProveedores([
        { id: "1", nombre: "Repuestos Talca SpA", ciudad: "Talca", telefono: "+56912345678", itemsCount: 450 },
        { id: "2", nombre: "AutoPlanet Sur", ciudad: "Talca", telefono: "+56987654321", itemsCount: 1200 },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (!roles.includes("SUPER_ADMIN")) {
    return <div className="p-10 text-center">No tienes acceso a esta ruta.</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/super-admin" className="p-2 bg-muted hover:bg-muted/80 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="text-primary" /> Red de Proveedores
            </h1>
            <p className="text-muted-foreground text-sm">Gestiona las casas de repuestos asociadas y sus catálogos B2B.</p>
          </div>
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
          <button className="w-full md:w-auto h-10 px-4 bg-primary text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90">
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
                <th className="px-6 py-4">Catálogo</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">Cargando proveedores...</td>
                </tr>
              ) : proveedores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No hay proveedores registrados aún.</td>
                </tr>
              ) : (
                proveedores.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold">{p.nombre}</td>
                    <td className="px-6 py-4">{p.ciudad}</td>
                    <td className="px-6 py-4">{p.telefono}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                        {p.itemsCount} ítems
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-primary tooltip" title="Subir Excel">
                        <Upload size={16} />
                      </button>
                      <button className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-muted-foreground tooltip" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button className="p-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg text-destructive tooltip" title="Eliminar">
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
    </div>
  );
}
