const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// remove everything between Initialize Firebase Admin and const SAPPAY_BASE_PUBLIC_SANDBOX
serverCode = serverCode.replace(/\/\/ Initialize Firebase Admin utilizing credentials if available[\s\S]*?(?=const SAPPAY_BASE_PUBLIC_SANDBOX)/g, 'let adminDb: any = null;\n');

// Also remove `generatePasswordResetLink` which was `resetLink = await (()=>({}))().generatePasswordResetLink(email);`
serverCode = serverCode.replace(/let resetLink = "";[\s\S]*?(?=else \{)/g, 'let resetLink = "";\n      ');

fs.writeFileSync('server.ts', serverCode);

