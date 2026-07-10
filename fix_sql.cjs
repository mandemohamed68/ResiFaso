const fs = require('fs');
const p = 'src/db/queries.ts';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(
  "return val;\n};",
  "if (val === undefined) return null;\n  return val;\n};"
);

fs.writeFileSync(p, txt);
