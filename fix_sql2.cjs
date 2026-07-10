const fs = require('fs');
const p = 'src/db/queries.ts';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(
  "else if (k === 'createdAt') mappedUpdates.created_at = dbValue;",
  "else if (k === 'createdAt') mappedUpdates.created_at = dbValue;\n    else if (k === 'password') mappedUpdates.password_hash = dbValue;"
);

fs.writeFileSync(p, txt);
