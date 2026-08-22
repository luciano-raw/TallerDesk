const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/dashboard-client.tsx', 'utf8');
c = c.replace(/setNewTrabajoData\(\{ titulo: "", tareas: \[\] \}\);/g, 'setNewTrabajoData({ titulo: "", estimacionMinutos: 0, tareas: [] });');
fs.writeFileSync('src/app/dashboard/dashboard-client.tsx', c, 'utf8');
