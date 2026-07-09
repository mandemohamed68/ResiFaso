const fs = require('fs');
let code = fs.readFileSync('src/db/init.ts', 'utf8');

// For contact_messages
code = code.replace(
  /await executeSql\("ALTER TABLE contact_messages ADD COLUMN admin_notes TEXT"\)\.catch\(\(\) => \{\}\);\s*await executeSql\("ALTER TABLE contact_messages ADD COLUMN replied_at VARCHAR\(50\)"\)\.catch\(\(\) => \{\}\);/,
  `const cols_msg = await executeSql("SHOW COLUMNS FROM contact_messages LIKE 'admin_notes'");
      if (!cols_msg || cols_msg.length === 0) {
        await executeSql("ALTER TABLE contact_messages ADD COLUMN admin_notes TEXT");
      }
      const cols_msg_replied = await executeSql("SHOW COLUMNS FROM contact_messages LIKE 'replied_at'");
      if (!cols_msg_replied || cols_msg_replied.length === 0) {
        await executeSql("ALTER TABLE contact_messages ADD COLUMN replied_at VARCHAR(50)");
      }`
);

fs.writeFileSync('src/db/init.ts', code);
