export const CAR_BRANDS_MODELS: Record<string, string[]> = {
  "TOYOTA": ["YARIS", "HILUX", "COROLLA", "RAV4", "RUSH", "FORTUNER", "AURIS", "PRIUS"],
  "CHEVROLET": ["SPARK", "SAIL", "ONIX", "COLORADO", "TRACKER", "SILVERADO", "GROOVE", "CAPTIVA"],
  "SUZUKI": ["SWIFT", "BALENO", "VITARA", "JIMNY", "S-PRESSO", "CELERIO", "ALTO", "GRAND VITARA"],
  "NISSAN": ["VERSA", "KICKS", "NAVARA", "QASHQAI", "X-TRAIL", "MARCH", "SENTRA"],
  "HYUNDAI": ["ACCENT", "TUCSON", "SANTA FE", "GRAND I10", "I20", "ELANTRA", "CRETA", "H-1"],
  "KIA": ["MORNING", "RIO", "SPORTAGE", "SORENTO", "CERATO", "SOLUTO", "FRONTIER"],
  "PEUGEOT": ["208", "308", "2008", "3008", "PARTNER", "BOXER", "EXPERT"],
  "FORD": ["F-150", "RANGER", "TERRITORY", "EXPLORER", "ESCAPE", "ECOSPORT", "MUSTANG"],
  "MG": ["ZS", "MG3", "RX5", "HS", "MG5"],
  "CHERY": ["TIGGO 2", "TIGGO 3", "TIGGO 7", "TIGGO 8", "IQ"],
  "VOLKSWAGEN": ["GOL", "POLO", "AMAROK", "TIGUAN", "T-CROSS", "SAVEIRO", "JETTA"],
  "MAZDA": ["MAZDA3", "MAZDA2", "CX-5", "CX-3", "BT-50"],
  "HONDA": ["CIVIC", "CR-V", "HR-V", "ACCORD", "PILOT", "FIT"],
  "MITSUBISHI": ["L200", "OUTLANDER", "MONTERO", "ECLIPSE CROSS"],
  "RENAULT": ["CLIO", "DUSTER", "OROCH", "KWID", "SYMBOL", "MEGANE", "KANGOO"]
};

export const getAllBrands = () => Object.keys(CAR_BRANDS_MODELS).sort();

export const getModelsForBrand = (brand: string) => {
  const normalized = brand.toUpperCase();
  return CAR_BRANDS_MODELS[normalized] || [];
};

export const getYears = () => {
  const currentYear = new Date().getFullYear() + 1;
  const years = [];
  for (let y = currentYear; y >= 1980; y--) {
    years.push(y.toString());
  }
  return years;
};
