const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/dashboard-client.tsx', 'utf8');
c = c.replace(/min-w-\[120px\]/g, 'w-full max-w-[130px]');
fs.writeFileSync('src/app/dashboard/dashboard-client.tsx', c, 'utf8');
