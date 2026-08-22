const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/dashboard-client.tsx', 'utf8');
const start = c.indexOf('Órdenes de Trabajo Activas');
const end = c.indexOf('Disponibilidad Mecánicos');
let block = c.substring(start, end);
block = block.replace(/className="p-4/g, 'className="px-2 py-3');
block = block.replace(/min-w-\[120px\]/g, 'w-full max-w-[130px]');
c = c.substring(0, start) + block + c.substring(end);
fs.writeFileSync('src/app/dashboard/dashboard-client.tsx', c, 'utf8');
