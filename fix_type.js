const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/dashboard-client.tsx', 'utf8');
c = c.replace(/const \[newCostItemType, setNewCostItemType\] = useState<"MANO_OBRA" \| "REPUESTO">("MANO_OBRA");/, 'const [newCostItemType, setNewCostItemType] = useState<"MANO_OBRA" | "REPUESTO" | "REPUESTO_BODEGA">("MANO_OBRA");\n  const [newCostBodegaId, setNewCostBodegaId] = useState("");\n  const [newCostCantidad, setNewCostCantidad] = useState("1");');
fs.writeFileSync('src/app/dashboard/dashboard-client.tsx', c, 'utf8');
