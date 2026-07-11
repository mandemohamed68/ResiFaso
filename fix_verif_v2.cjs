const fs = require('fs');
const p = 'src/components/booking/BookingVerificationSection.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(
  'const toggleVerification = async (id: string) => {',
  'const toggleVerification = async (id: string) => {\n    console.log("toggleVerification called for", id, "current status:", status[id]);'
);

txt = txt.replace(
  'const newStatus = !status[id];',
  'const newStatus = !status[id];\n    console.log("newStatus to set:", newStatus);'
);

txt = txt.replace(
  '    } catch (err) {\n      console.error("Error updating verification:", err);\n    }',
  '    } catch (err) {\n      console.error("Error updating verification:", err);\n      alert("Erreur lors de la mise à jour : " + err.message);\n    }'
);

fs.writeFileSync(p, txt);
