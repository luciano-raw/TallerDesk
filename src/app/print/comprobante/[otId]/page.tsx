"use client";

import { useEffect, useState } from "react";
import { getOTForPrint } from "@/lib/db-actions";
import { useParams, useSearchParams } from "next/navigation";
import { Printer, Loader2 } from "lucide-react";

export default function PrintComprobante() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [ot, setOt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const format = searchParams.get("format") || "ticket"; // ticket o a4
  const docType = searchParams.get("docType") || "boleta"; // boleta o factura

  useEffect(() => {
    async function fetchOT() {
      if (params.otId) {
        const data = await getOTForPrint(params.otId as string);
        setOt(data);
      }
      setLoading(false);
    }
    fetchOT();
  }, [params.otId]);

  // Ejecuta la impresión al cargar
  useEffect(() => {
    if (!loading && ot) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, ot]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (!ot) {
    return <div className="p-8 text-red-500">OT no encontrada.</div>;
  }

  const iva = Math.round(Number(ot.costoTotal) * 0.19);
  const neto = Number(ot.costoTotal) - iva;

  if (format === "ticket") {
    return (
      <div className="bg-white text-black text-sm p-4 mx-auto font-mono" style={{ width: "300px", maxWidth: "100%" }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 0; size: 80mm 297mm; }
            body { margin: 0; }
          }
        `}} />
        <div className="text-center mb-4 border-b border-black pb-2">
          <h1 className="font-bold text-xl uppercase">{ot.taller?.nombre || "TallerDesk"}</h1>
          <p className="text-xs">Comprobante de Servicio</p>
          <p className="text-xs">Orden: {ot.codigo}</p>
        </div>

        <div className="mb-4 border-b border-black pb-2">
          <p><strong>Cliente:</strong> {ot.vehiculo?.cliente?.nombre}</p>
          <p><strong>Vehículo:</strong> {ot.vehiculo?.marca} {ot.vehiculo?.modelo}</p>
          <p><strong>Patente:</strong> {ot.vehiculo?.patente}</p>
          {ot.kilometraje && <p><strong>Kilometraje:</strong> {ot.kilometraje.toLocaleString("es-CL")} km</p>}
          {ot.tecnico && <p><strong>Técnico:</strong> {ot.tecnico.nombre}</p>}
          <p><strong>Fecha:</strong> {new Date().toLocaleDateString("es-CL")}</p>
        </div>

        <div className="mb-4">
          <p className="font-bold uppercase text-xs mb-1">Detalle</p>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td>Mano de Obra</td>
                <td className="text-right">${Number(ot.costoManoObra).toLocaleString("es-CL")}</td>
              </tr>
              {ot.itemsPresupuesto?.map((i: any) => (
                <tr key={i.id}>
                  <td className="truncate max-w-[150px]">{i.descripcion}</td>
                  <td className="text-right">${Number(i.monto).toLocaleString("es-CL")}</td>
                </tr>
              ))}
              {ot.trabajosAdicionales?.filter((t: any) => t.estadoAprobacion === "APROBADO").map((t: any) => (
                <tr key={t.id}>
                  <td className="truncate max-w-[150px]">{t.titulo}</td>
                  <td className="text-right">${Number(t.monto).toLocaleString("es-CL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-black pt-2 mb-4 text-xs space-y-1">
          <div className="flex justify-between">
            <span>NETO:</span>
            <span>${neto.toLocaleString("es-CL")}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (19%):</span>
            <span>${iva.toLocaleString("es-CL")}</span>
          </div>
          <div className="flex justify-between font-bold text-sm mt-1 border-t border-black pt-1">
            <span>TOTAL:</span>
            <span>${Number(ot.costoTotal).toLocaleString("es-CL")}</span>
          </div>
        </div>

        <div className="text-center text-[10px] mt-6 italic">
          <p>*** COPIA {docType.toUpperCase()} ***</p>
          <p>Gracias por su preferencia</p>
          <p>Generado por TallerDesk</p>
        </div>
      </div>
    );
  }

  // A4 FORMAT
  return (
    <div className="bg-white text-black p-8 mx-auto" style={{ maxWidth: "210mm" }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0; size: A4 portrait; }
          body { background: white; }
        }
      `}} />
      
      <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold uppercase">{ot.taller?.nombre || "TallerDesk"}</h1>
          <p className="text-gray-600 mt-1">{docType === "factura" ? "FACTURA PROFORMA" : "COMPROBANTE DE SERVICIO"}</p>
        </div>
        <div className="text-right border border-gray-800 p-2 rounded">
          <p className="font-bold text-lg text-red-600">N° {ot.codigo}</p>
          <p className="text-sm">Fecha: {new Date().toLocaleDateString("es-CL")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="border border-gray-300 p-4 rounded bg-gray-50">
          <h2 className="font-bold border-b border-gray-300 pb-1 mb-2">Datos del Cliente</h2>
          <p><strong>Nombre:</strong> {ot.vehiculo?.cliente?.nombre}</p>
          <p><strong>Email:</strong> {ot.vehiculo?.cliente?.email || "N/A"}</p>
          <p><strong>Teléfono:</strong> {ot.vehiculo?.cliente?.telefono || "N/A"}</p>
          {docType === "factura" && (
            <>
              <p><strong>RUT Empresa:</strong> ___________________</p>
              <p><strong>Giro:</strong> ________________________</p>
            </>
          )}
        </div>
        <div className="border border-gray-300 p-4 rounded bg-gray-50">
          <h2 className="font-bold border-b border-gray-300 pb-1 mb-2">Datos del Vehículo</h2>
          <p><strong>Vehículo:</strong> {ot.vehiculo?.marca} {ot.vehiculo?.modelo}</p>
          <p><strong>Patente:</strong> {ot.vehiculo?.patente}</p>
          <p><strong>VIN:</strong> {ot.vehiculo?.vin || "N/A"}</p>
          {ot.kilometraje && <p><strong>Kilometraje:</strong> {ot.kilometraje.toLocaleString("es-CL")} km</p>}
          {ot.tecnico && <p><strong>Técnico Responsable:</strong> {ot.tecnico.nombre}</p>}
        </div>
      </div>

      <div className="mb-8 min-h-[300px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="p-2 border border-gray-800">Descripción del Servicio / Repuesto</th>
              <th className="p-2 border border-gray-800 text-right w-32">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border border-gray-300">Servicio Base (Mano de Obra)</td>
              <td className="p-2 border border-gray-300 text-right">${Number(ot.costoManoObra).toLocaleString("es-CL")}</td>
            </tr>
            {ot.itemsPresupuesto?.map((i: any) => (
              <tr key={i.id}>
                <td className="p-2 border border-gray-300">{i.descripcion}</td>
                <td className="p-2 border border-gray-300 text-right">${Number(i.monto).toLocaleString("es-CL")}</td>
              </tr>
            ))}
            {ot.trabajosAdicionales?.filter((t: any) => t.estadoAprobacion === "APROBADO").map((t: any) => (
              <tr key={t.id}>
                <td className="p-2 border border-gray-300">TRABAJO ADICIONAL: {t.titulo}</td>
                <td className="p-2 border border-gray-300 text-right">${Number(t.monto).toLocaleString("es-CL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-8">
        <div className="w-64 border border-gray-800 rounded">
          <div className="flex justify-between p-2 border-b border-gray-300">
            <span>NETO:</span>
            <span>${neto.toLocaleString("es-CL")}</span>
          </div>
          <div className="flex justify-between p-2 border-b border-gray-300">
            <span>IVA (19%):</span>
            <span>${iva.toLocaleString("es-CL")}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-100 font-bold text-lg">
            <span>TOTAL:</span>
            <span>${Number(ot.costoTotal).toLocaleString("es-CL")}</span>
          </div>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-gray-300 text-center text-gray-500 text-sm">
        <p>Documento de control interno no válido como boleta fiscal oficial.</p>
        <p>Generado por TallerDesk</p>
      </div>

      {/* Botón flotante para re-imprimir (solo se ve en pantalla) */}
      <button 
        onClick={() => window.print()}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg print:hidden hover:bg-blue-700"
      >
        <Printer size={24} />
      </button>
    </div>
  );
}
