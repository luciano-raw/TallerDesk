"use client";

import React, { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { createClient } from "@supabase/supabase-js";
import { Camera, X, UploadCloud, Loader2 } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface EvidenciaUploaderProps {
  ordenTrabajoId: string;
  trabajoId?: string;
  esRecepcion?: boolean;
  onUploadSuccess: (url: string, id: string) => void;
  label?: string;
}

export default function EvidenciaUploader({
  ordenTrabajoId,
  trabajoId,
  esRecepcion = false,
  onUploadSuccess,
  label = "Tomar / Subir Foto"
}: EvidenciaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!supabaseUrl || !supabaseAnonKey) {
      setError("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en el .env.local");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      const fileExt = compressedFile.name.split('.').pop() || 'jpg';
      const fileName = `${ordenTrabajoId}-${Date.now()}.${fileExt}`;
      const filePath = `${ordenTrabajoId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("ot-evidencias")
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("ot-evidencias")
        .getPublicUrl(filePath);

      const res = await fetch("/api/upload-evidencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordenTrabajoId,
          trabajoId,
          esRecepcion,
          url: publicUrl,
          descripcion: file.name
        })
      });

      const dbRes = await res.json();
      if (!dbRes.success) throw new Error(`API: ${dbRes.error}`);

      onUploadSuccess(publicUrl, dbRes.data.id);
      
    } catch (err: any) {
      console.error("Error al subir:", err);
      // Extraer mensaje detallado
      const errMsg = err?.message || err?.error || JSON.stringify(err);
      setError(`Error al subir la imagen: ${errMsg}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <button
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
          `}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Comprimiendo...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            {label}
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded flex items-start gap-1">
          <X className="w-3 h-3 mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
