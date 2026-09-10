"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelect: (date: string) => void;
}

export function DatePickerModal({ isOpen, onClose, selectedDate, onSelect }: DatePickerModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (selectedDate) {
      const [year, month, day] = selectedDate.split('-');
      if (year && month) {
        setCurrentMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
      }
    } else {
      setCurrentMonth(new Date());
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1; // Lunes = 0, Domingo = 6
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (date >= today) {
      const formattedDate = date.toISOString().split('T')[0];
      onSelect(formattedDate);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-primary" />
            <h3 className="font-bold text-foreground">Seleccionar Fecha</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={handlePrevMonth}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              disabled={currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth()}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-foreground">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map(d => (
              <div key={d} className="text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const isPast = date < today;
              const isSelected = selectedDate === date.toISOString().split('T')[0];
              const isToday = date.getTime() === today.getTime();

              return (
                <button
                  key={day}
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  className={`h-10 w-full rounded-lg flex items-center justify-center text-sm transition-all ${isSelected ? 'bg-primary text-white font-bold shadow-md' : ''} ${!isSelected && !isPast ? 'hover:bg-primary/10 hover:text-primary text-foreground' : ''} ${isPast ? 'text-muted-foreground/30 cursor-not-allowed' : ''} ${isToday && !isSelected ? 'border border-primary text-primary font-bold' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
