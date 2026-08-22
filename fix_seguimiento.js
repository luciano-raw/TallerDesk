const fs = require('fs');
let c = fs.readFileSync('src/app/seguimiento/[token]/page.tsx', 'utf8');
c = c.replace(/estado: ta\.estado/g, 'estado: ta.estadoAprobacion');
c = c.replace(/ta\.estado === "PENDIENTE"/g, 'ta.estado === "PENDIENTE_APROBACION"');
fs.writeFileSync('src/app/seguimiento/[token]/page.tsx', c, 'utf8');
