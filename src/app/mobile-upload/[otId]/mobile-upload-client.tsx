"use client";

import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, CheckCircle2, Upload, AlertCircle, RefreshCw } from 'lucide-react';

const REQUIRED_PHOTOS = [
  { id: 'frente', label: 'Foto Frontal', description: 'Vista clara de la patente delantera y parachoques.' },
  { id: 'atras', label: 'Foto Trasera', description: 'Vista clara de la patente trasera y maletero.' },
  { id: 'izquierdo', label: 'Lateral Izquierdo', description: 'Vista completa del costado del conductor.' },
  { id: 'derecho', label: 'Lateral Derecho', description: 'Vista completa del costado del copiloto.' },
];

export function MobileUploadClient({ otId, tallerNombre }: { otId: string, tallerNombre: string }) {
  const [uploads, setUploads] = useState<Record<string, { status: 'pending' | 'uploading' | 'done', url?: string }>>(
    REQUIRED_PHOTOS.reduce((acc, photo) => ({ ...acc, [photo.id]: { status: 'pending' } }), {})
  );
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, photoId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploads(prev => ({ ...prev, [photoId]: { status: 'uploading' } }));
    setError(null);

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      const base64 = await imageCompression.getDataUrlFromFile(compressedFile);

      const response = await fetch('/api/upload-evidencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otId,
          base64Image: base64,
          tipo: 'RECEPCION',
          descripcion: `Recepcin: ` + REQUIRED_PHOTOS.find(p => p.id === photoId)?.label
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al subir la imagen');
      }

      setUploads(prev => ({ ...prev, [photoId]: { status: 'done', url: data.data.url } }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error desconocido al procesar la imagen');
      setUploads(prev => ({ ...prev, [photoId]: { status: 'pending' } }));
    }
  };

  const allDone = Object.values(uploads).every(u => u.status === 'done');

  if (allDone) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-background min-h-[100dvh]">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Fotos Completadas</h1>
        <p className="text-muted-foreground mb-8">Las 4 fotos han sido guardadas y sincronizadas con el computador de Recepcin.</p>
        <p className="text-sm font-semibold">Ya puedes cerrar esta ventana y volver a la oficina.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg leading-tight">Recepcin de Vehculo</h1>
            <p className="text-xs text-muted-foreground">{tallerNombre}</p>
          </div>
          <div className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
            {Object.values(uploads).filter(u => u.status === 'done').length} / 4
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-20">
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 p-4 rounded-xl text-sm mb-6 flex gap-3">
          <Camera className="shrink-0" />
          <p>Toma las 4 fotos obligatorias del permetro del vehculo para documentar su estado al ingresar.</p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {REQUIRED_PHOTOS.map(photo => {
            const status = uploads[photo.id].status;
            
            return (
              <div key={photo.id} className={`border rounded-2xl p-4 transition-all `}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      {status === 'done' && <CheckCircle2 size={16} className="text-primary" />}
                      {photo.label}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{photo.description}</p>
                  </div>
                </div>

                {status === 'done' ? (
                  <div className="h-32 w-full rounded-xl bg-muted overflow-hidden relative border border-border">
                    <img src={uploads[photo.id].url} alt={photo.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <label className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer">
                        <RefreshCw size={16} />
                        Repetir
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden"
                          onChange={(e) => handleFileChange(e, photo.id)}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className={`h-24 w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors `}>
                    {status === 'uploading' ? (
                      <>
                        <RefreshCw size={24} className="animate-spin" />
                        <span className="text-sm font-semibold">Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={24} />
                        <span className="text-sm font-bold">Abrir Cmara</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      className="hidden"
                      disabled={status === 'uploading'}
                      onChange={(e) => handleFileChange(e, photo.id)}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
