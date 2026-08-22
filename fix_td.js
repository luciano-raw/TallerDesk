const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/dashboard-client.tsx', 'utf8');
const start = c.indexOf('<tbody className="divide-y divide-border">');
const end = c.indexOf('</table>');
let block = c.substring(start, end);
block = block.replace(/<td className="p-4 /g, '<td className="px-2 py-3 ');
block = block.replace(/<td className="p-4">/g, '<td className="px-2 py-3">');
c = c.substring(0, start) + block + c.substring(end);
fs.writeFileSync('src/app/dashboard/dashboard-client.tsx', c, 'utf8');
