const fs = require('fs');
let file = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');
file = file.replace(/    sql \+\= \`\)\;\\n\\n\`\;/g, '    if (format === "mariadb") { sql += `) PARTITION BY KEY(id) PARTITIONS 4;\\n\\n`; } else { sql += `);\\n\\n`; }');
fs.writeFileSync('src/components/admin/AdminDashboard.tsx', file);
