const fs = require('fs');

let code = fs.readFileSync('src/components/profile/ProfileSettings.tsx', 'utf8');

// Replace await updateDoc(userRef, { ... }) with fetch call
code = code.replace(/await updateDoc\(userRef, (\{[\s\S]*?\})\);/g, "await fetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify($1) });");

// Remove const userRef = doc(db, 'users', user.uid);
code = code.replace(/const userRef = doc\(db, 'users', user\.uid\);/g, "");

fs.writeFileSync('src/components/profile/ProfileSettings.tsx', code);
