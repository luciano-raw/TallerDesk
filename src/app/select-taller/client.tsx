'use client';

import { setActiveTallerCookie } from "@/lib/db-actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Store, ChevronRight, Loader2 } from "lucide-react";

export default function SelectTallerClient({ talleres }: { talleres: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSelect = async (tallerId: string) => {
    setLoadingId(tallerId);
    await setActiveTallerCookie(tallerId);
    window.location.href = "/dashboard"; // Force full reload to reset all server states and auth-wrapper
  };

  return (
    <div className="space-y-3">
      {talleres.map(t => (
        <button
          key={t.id}
          onClick={() => handleSelect(t.id)}
          disabled={loadingId !== null}
          className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group disabled:opacity-50 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Store size={20} />
            </div>
            <span className="font-semibold text-gray-800">{t.nombre}</span>
          </div>
          {loadingId === t.id ? (
            <Loader2 className="animate-spin text-primary" size={18} />
          ) : (
            <ChevronRight size={18} className="text-gray-400 group-hover:text-primary transition-colors" />
          )}
        </button>
      ))}
    </div>
  );
}
