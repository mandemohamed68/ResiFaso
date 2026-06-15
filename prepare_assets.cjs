const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const publicLogoPath = path.join(process.cwd(), 'public', 'logo.png');
const assetsDir = path.join(process.cwd(), 'assets');
const iconPath = path.join(assetsDir, 'icon.png');
const splashPath = path.join(assetsDir, 'splash.png');

try {
  if (fs.existsSync(publicLogoPath)) {
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
    fs.copyFileSync(publicLogoPath, iconPath);
    fs.copyFileSync(publicLogoPath, splashPath);
    console.log('Copied logo to assets/icon.png and assets/splash.png');
    
    console.log('Generating Android resources from icon.png and splash.png...');
    execSync('npx capacitor-assets generate --android', { stdio: 'inherit' });
    console.log('Android adaptive icons generated successfully!');
  } else {
    console.error('No logo found inside public/logo.png - please ensure it is present.');
  }
} catch (error) {
  console.error('Error generating assets:', error);
}
