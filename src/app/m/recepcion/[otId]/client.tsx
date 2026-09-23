"use client";

import React, { useState, useRef } from "react";
import { Camera, CheckCircle2, ChevronRight, UploadCloud, AlertCircle } from "lucide-react";
import imageCompression from "browser-image-compression";

interface MobileWizardClientProps {
  otId: string;
  vehiculoInfo: string;
}

const PASOS = [
  { id: 'frontal', label: 'Foto Frontal', desc: 'Que se vea la patente y cap.' },
  { id: 'trasera', label: 'Foto Trasera', desc: 'Que se vea la patente trasera y maletero.' },
  { id: 'lateral_izq', label: 'Lateral Izquierdo', desc: 'Costado del conductor.' },
  { id: 'lateral_der', label: 'Lateral Derecho', desc: 'Costado del copiloto.' },
];

export default function MobileWizardClient({ otId, vehiculoInfo }: MobileWizardClientProps) {
  const [pasoActual, setPasoActual] = useState(0);
  const [fotos, setFotos] = useState<{ [key: string]: File }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotos(prev => ({ ...prev, [PASOS[pasoActual].id]: file }));
      
      // Auto avanzar al siguiente paso si no es el ltimo
      if (pasoActual < PASOS.length - 1) {
        setTimeout(() => {
          setPasoActual(prev => prev + 1);
        }, 300);
      }
    }
  };

  const handleUploadAll = async () => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const keys = Object.keys(fotos);
    if (keys.length === 0) {
      setError("No hay fotos para subir.");
      setIsUploading(false);
      return;
    }

    let subidas = 0;

    try {
      for (const key of keys) {
        const file = fotos[key];
        const stepIndex = PASOS.findIndex(p => p.id === key);
        const stepLabel = stepIndex >= 0 ? PASOS[stepIndex].label : key;

        // Comprimir
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          fileType: 'image/jpeg'
        };
        
        const compressedFile = await imageCompression(file, options);
        
        // Renombrar archivo para identificar el costado
        const finalFile = new File([compressedFile], `recepcion_.jpg`, { type: 'image/jpeg' });

        // Subir a Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        const filePath = `${otId}/recepcion-${key}-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from("ot-evidencias")
          .upload(filePath, finalFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("ot-evidencias")
          .getPublicUrl(filePath);

        // Guardar en la base de datos
        const res = await fetch("/api/upload-evidencia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ordenTrabajoId: otId,
            esRecepcion: true,
            url: publicUrl,
            descripcion: `Recepción - ${stepLabel}`
          })
        });

        if (!res.ok) {
          throw new Error(`Error de API al subir la foto`);
        }

        subidas++;
        setUploadProgress(Math.round((subidas / keys.length) * 100));
      }

      setIsDone(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurri un error al subir las fotos.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isDone) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Fotos Enviadas</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Las {Object.keys(fotos).length} fotos se han adjuntado correctamente a la Orden de Trabajo.
        </p>
        <p className="text-xs font-bold mt-8 text-primary">
          Ya puedes cerrar esta ventana y volver a tu computador.
        </p>
      </div>
    );
  }

  const allDone = Object.keys(fotos).length === PASOS.length;

  return (
    <div className="flex flex-col h-full">
      {/* Progreso Visual */}
      <div className="flex items-center justify-between mb-6 px-2">
        {PASOS.map((paso, idx) => {
          const hasPhoto = !!fotos[paso.id];
          const isCurrent = idx === pasoActual;
          return (
            <div key={paso.id} className="flex flex-col items-center relative z-0 flex-1">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors z-10 
                  
                `}
              >
                {hasPhoto ? <CheckCircle2 size={16} /> : (idx + 1)}
              </div>
              {idx < PASOS.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-10 `}></div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tarjeta de Paso Actual */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-card border border-border w-full rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
             <div className="h-full bg-primary transition-all duration-300" style={{ width: `%` }}></div>
          </div>
          
          <h2 className="text-xl font-bold mb-1 mt-2">{PASOS[pasoActual].label}</h2>
          <p className="text-sm text-muted-foreground mb-8">{PASOS[pasoActual].desc}</p>

          <input 
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleCapture}
          />

          {fotos[PASOS[pasoActual].id] ? (
            <div className="mb-6">
              <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/5 border border-border relative">
                <img 
                  src={URL.createObjectURL(fotos[PASOS[pasoActual].id])} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                   <span className="text-white text-xs font-bold">Foto Lista</span>
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 text-primary text-sm font-semibold hover:underline"
              >
                Volver a tomar foto
              </button>
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 mx-auto rounded-full bg-primary/10 text-primary flex flex-col items-center justify-center gap-2 hover:bg-primary/20 transition-all active:scale-95">
              <Camera size={40} />
              <span className="font-bold text-sm">ABRIR CMARA</span>
            </button>
          )}

        </div>

        {/* Botones de Navegacin */}
        <div className="w-full flex justify-between mt-6 gap-4">
          <button 
            onClick={() => setPasoActual(prev => Math.max(0, prev - 1))}
            disabled={pasoActual === 0}
            className="px-4 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
          >
            Anterior
          </button>
          
          {pasoActual < PASOS.length - 1 ? (
             <button 
               onClick={() => setPasoActual(prev => Math.min(PASOS.length - 1, prev + 1))}
               className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold flex items-center justify-center gap-2"
             >
               Siguiente <ChevronRight size={16} />
             </button>
          ) : (
            <button 
              disabled={!allDone || isUploading}
              onClick={handleUploadAll}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale transition-all"
            >
              {isUploading ? (
                <>
                  <UploadCloud className="animate-bounce" size={18} /> Subiendo... {uploadProgress}%
                </>
              ) : (
                <>
                  Subir 4 Fotos
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
