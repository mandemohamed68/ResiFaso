const fs = require('fs');

let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

// Location related firebase calls -> dummy API calls
code = code.replace(/await setDoc\(doc\(db, 'locations'[\s\S]*?\n\s*\}\);/g, `await fetch('/api/admin/locations', { method: 'POST', body: JSON.stringify({ id: cityId || selectedCityForNeighborhood, name: newCityName || city?.name, newNb }) });`);

code = code.replace(/await updateDoc\(doc\(db, 'locations', selectedCityForNeighborhood\), \{[\s\S]*?\}\);/g, `await fetch('/api/admin/locations', { method: 'PUT', body: JSON.stringify({ id: selectedCityForNeighborhood, newNb }) });`);

code = code.replace(/await deleteDoc\(doc\(db, 'locations', id\)\);/g, `await fetch(\`/api/admin/locations/\${id}\`, { method: 'DELETE' });`);

// Update user settings calls
code = code.replace(/await updateDoc\(doc\(db, 'users', uid\), (\{[\s\S]*?\})\);/g, `await fetch(\`/api/users/\${uid}\`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }, body: JSON.stringify($1) });`);

// Contact Messages
code = code.replace(/await setDoc\(doc\(db, 'contact_settings', 'main'\), (\{[\s\S]*?\})\);/g, `await fetch('/api/settings/contact', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }, body: JSON.stringify($1) });`);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
