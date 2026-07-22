const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

const logoPath = path.join(__dirname, 'public', 'logoresifasoORG.png');
if (fs.existsSync(logoPath)) {
  fs.copyFileSync(logoPath, path.join(assetsDir, 'icon.png'));
  fs.copyFileSync(logoPath, path.join(assetsDir, 'splash.png'));
  console.log('Assets prepared for Capacitor in assets/ directory.');
} else {
  console.error('Error: public/logoresifaso.png not found');
}

const googleServicesSrc = path.join(__dirname, 'google-services.json');
const googleServicesDest = path.join(__dirname, 'android', 'app', 'google-services.json');
if (fs.existsSync(googleServicesSrc)) {
  const androidAppDir = path.join(__dirname, 'android', 'app');
  if (fs.existsSync(androidAppDir)) {
    fs.copyFileSync(googleServicesSrc, googleServicesDest);
    console.log('google-services.json copied to android/app/google-services.json successfully.');
  }
}

