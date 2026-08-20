"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface ComboboxVehiculoProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  disabled?: boolean;
}

export function ComboboxVehiculo({ label, placeholder, value, onChange, options, disabled }: ComboboxVehiculoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (opt: string) => {
    onChange(opt);
    setSearch(opt);
    setIsOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setIsFocused(false);
      // Si el usuario escribió algo y no seleccionó, igual lo guardamos
      if (search !== value) {
        onChange(search.toUpperCase());
      }
    }, 200);
  };

  return (
    <div className="relative w-full">
      {label && <label className="block text-[11px] font-semibold mb-1 text-foreground">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={search}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            setSearch(e.target.value.toUpperCase());
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setIsFocused(true);
          }}
          onBlur={handleBlur}
          className="w-full p-2.5 pr-10 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary uppercase transition-all"
        />
        <div 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        >
          <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && isFocused && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt}
                onMouseDown={() => handleSelect(opt)}
                className="px-3 py-2 text-xs cursor-pointer hover:bg-muted text-popover-foreground transition-colors"
              >
                {opt}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground italic">
              Se guardará "{search.toUpperCase()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
