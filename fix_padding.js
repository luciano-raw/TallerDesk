const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/dashboard-client.tsx', 'utf8');
const start = c.indexOf('activeTab === "ots"');
const end = c.indexOf('Disponibilidad Mecánicos');
let otsPart = c.substring(start, end);
const rest = c.substring(end);
otsPart = otsPart.replace(/className="p-4/g, 'className="px-2 py-3');
fs.writeFileSync('src/app/dashboard/dashboard-client.tsx', c.substring(0, start) + otsPart + rest, 'utf8');
