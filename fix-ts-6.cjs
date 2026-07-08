const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

serverCode = serverCode.replace(/if \(DB_TYPE === 'firebase'\) \{[\s\S]*?\}\n/g, 'if (DB_TYPE === "firebase") {}\n');

fs.writeFileSync('server.ts', serverCode);
