"client only";

import * as React from "react";
import { ChevronDown } from "lucide-react";

interface ComboboxVehiculoProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export function ComboboxVehiculo({ label, placeholder, value, onChange, options }: ComboboxVehiculoProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [search, setSearch] = React.useState(value || "");

  React.useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (option: string) => {
    setSearch(option);
    onChange(option);
    setIsOpen(false);
  };

  const handleBlur = () => {
    // Wait a bit to allow click on options before closing
    setTimeout(() => {
      setIsOpen(false);
      setIsFocused(false);
      // Si el usuario escribiÃ³ algo y no seleccionÃ³, igual lo guardamos
      if (search !== value) {
        onChange(search.toUpperCase());
      }
    }, 200);
  };

  return (
    <div className="relative w-full">
      {label && <label className="block text-[11px] font-semibold mb-1">{label}</label>}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          onBlur={handleBlur}
          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary uppercase"
        />
        <div 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        >
          <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && isFocused && (
        <div className="absolute z-50 w-full bg-card border border-border mt-1 rounded-md shadow-md max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option}
                className="px-3 py-2 text-xs hover:bg-muted cursor-pointer"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelect(option);
                }}
              >
                {option}
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
