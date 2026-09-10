"use client";

import { Clock, User } from "lucide-react";

export function WeeklyCalendar({ reservas, selectedDate, horaApertura, horaCierre, onConvertToOT }: any) {
  const start = new Date(selectedDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for(let i=0; i<7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const startHour = parseInt(horaApertura.split(":")[0]);
  const endHour = parseInt(horaCierre.split(":")[0]);
  const hours: number[] = [];
  for(let i=startHour; i<=endHour; i++) hours.push(i);

  const daysNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="grid grid-cols-8 border-b border-border bg-muted/30">
        <div className="p-2 text-center text-xs font-bold text-muted-foreground border-r border-border">Hora</div>
        {days.map((d, idx) => (
          <div key={idx} className="p-2 text-center border-r border-border last:border-0">
            <div className="text-xs font-bold text-foreground">{daysNames[idx]}</div>
            <div className="text-[10px] text-muted-foreground">{d.getDate()}/{d.getMonth()+1}</div>
          </div>
        ))}
      </div>
      
      <div className="overflow-y-auto flex-1" style={{ maxHeight: '600px' }}>
        {hours.map(h => (
          <div key={h} className="grid grid-cols-8 border-b border-border last:border-0">
            <div className="p-2 text-center text-xs font-semibold text-muted-foreground border-r border-border bg-muted/10">
              {h.toString().padStart(2, '0')}:00
            </div>
            {days.map((d, idx) => {
              // Find reservas for this day and hour
              const cellReservas = reservas.filter((r: any) => {
                const rDate = new Date(r.fechaHora);
                return rDate.getDate() === d.getDate() && rDate.getMonth() === d.getMonth() && rDate.getFullYear() === d.getFullYear() && rDate.getHours() === h;
              });

              return (
                <div key={idx} className="p-1 border-r border-border last:border-0 min-h-[80px] hover:bg-muted/30 transition-colors">
                  {cellReservas.map((r: any) => (
                    <div 
                      key={r.id}
                      onClick={() => onConvertToOT(r)}
                      className="mb-1 p-1.5 text-xs bg-primary/10 border border-primary/20 rounded-md cursor-pointer hover:bg-primary/20 transition-colors group relative"
                    >
                      <div className="font-bold text-primary truncate">{r.patente}</div>
                      <div className="text-[9px] text-muted-foreground truncate flex items-center gap-1"><User size={8}/>{r.clienteNombre.split(' ')[0]}</div>
                      <div className="absolute opacity-0 group-hover:opacity-100 z-10 bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg border -top-10 left-0 w-48 pointer-events-none transition-opacity">
                        <p className="font-bold">{r.patente} - {r.marca}</p>
                        <p>{r.tipoServicio}</p>
                        <p className="text-muted-foreground">{new Date(r.fechaHora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
