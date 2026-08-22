const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/dashboard-client.tsx', 'utf8');
c = c.replace(/xl:grid-cols-\[1fr_300px\] lg:grid-cols-\[1fr_250px\]/g, 'xl:grid-cols-[1fr_260px] lg:grid-cols-[1fr_220px]');
fs.writeFileSync('src/app/dashboard/dashboard-client.tsx', c, 'utf8');
