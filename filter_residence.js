const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
const cols = db.prepare("PRAGMA table_info('residences');").all().map(c => c.name);
console.log(JSON.stringify(cols));
