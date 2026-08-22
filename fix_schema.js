const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');
c = c.replace(/costoManoObra Decimal @default\(0\.0\)/, 'costoManoObra Decimal @default(0.0)\n  estimacionMinutos Int?    @default(0) // Tiempo estimado para completar el trabajo');
fs.writeFileSync('prisma/schema.prisma', c, 'utf8');
