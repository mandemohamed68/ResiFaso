import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const publicLogoPath = path.join(process.cwd(), 'public', 'logo.png');
const assetsDir = path.join(process.cwd(), 'assets');
const iconPath = path.join(assetsDir, 'icon.png');
const splashPath = path.join(assetsDir, 'splash.png');

if (fs.existsSync(publicLogoPath)) {
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
  fs.copyFileSync(publicLogoPath, iconPath);
  fs.copyFileSync(publicLogoPath, splashPath);
  console.log('Copied logo to icon.png and splash.png');
  execSync('npx capacitor-assets generate --android', { stdio: 'inherit' });
} else {
  console.error('No logo found inside public/');
}
