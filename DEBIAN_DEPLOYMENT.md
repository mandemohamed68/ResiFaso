# 🚀 Guide de Déploiement Local sur Debian 12 (Bookworm)

Ce guide décrit en détail les étapes pour installer, configurer et exécuter cette application Node.js / React (RESIFASO) en production sur votre serveur local sous **Debian 12**.

---

## 📌 Architecture de Production
- **Frontend** : Compilé en composants statiques hautement performants (placés sous `/dist`).
- **Backend / Proxy** : Serveur HTTP Express fonctionnant sur le port `3000` (déployé en format optimisé CJS sous `dist/server.cjs`).
- **Nginx** : Agit en tant que Reverse Proxy pour rediriger le trafic HTTP standard (port `80`) vers le port `3000`.
- **PM2** : Gestionnaire de processus Node.js pour assurer un démarrage automatique au reboot et une haute disponibilité.

---

## 🛠️ Étape 1 : Prérequis système

Connectez-vous en SSH ou ouvrez un terminal sur votre serveur Debian 12 et installez les paquets de base :

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx
```

---

## 📦 Étape 2 : Installation de Node.js v20 (LTS)

Nous vous conseillons d'installer Node.js v20+ via le dépôt binaire officiel NodeSource :

```bash
# Ajout de la clé et du dépôt NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérification des versions
node -v
npm -v
```

---

## 📁 Étape 3 : Récupération du Projet et Installation des Dépendances

Clonez ou transférez votre projet dans le dossier de votre choix (ex: `/var/www/resifaso`) :

```bash
sudo mkdir -p /var/www/resifaso
sudo chown -R $USER:$USER /var/www/resifaso
cd /var/www/resifaso

# Copiez ou clonez les fichiers du projet ici. Une fois fait, installez les dépendances :
npm install
```

---

## ⚙️ Étape 4 : Configuration des Variables d'Environnement (`.env`)

Copiez le fichier d'exemple et renseignez vos variables d'environnement professionnelles :

```bash
cp .env.example .env
nano .env
```

votre fichier `.env` doit contenir :

```env
# Port d'écoute de l'application (Par défaut: 3000)
PORT=3000

# Mode de Node.js (production)
NODE_ENV=production

# Clé API optionnelle si vous utilisez des services d'IA Gemini
GEMINI_API_KEY="votre_cle_gemini"

# URL publique optionnelle de l'application
APP_URL="http://votre-domaine-ou-ip"

# Optionnel : Surcharges manuelles des URLs SAPPAY (Le cas échéant)
SAPPAY_BASE_PUBLIC="https://api.sappay.net/api/v1"
SAPPAY_BASE_CHECKOUT="https://api.sappay.net/api/v1/checkout"
```

### 📁 Firebase - Base de données Firestore
Pour que la base de données Firestore fonctionne sur votre serveur local Debian 12 :
1. Allez sur votre console Firebase.
2. Créez un compte de service dans **Paramètres du projet > Comptes de service**.
3. Générez une clé privée au format JSON.
4. Téléchargez-la et sauvegardez-la sous le nom `firebase-applet-config.json` à la racine de votre dossier `/var/www/resifaso`.
5. Le serveur Express chargera automatiquement ces identifiants de sécurité de manière isolée et cryptée.

---

## 🏗️ Étape 5 : Compilation de l'Application pour la Production

Lancez le script d'assemblage configuré de manière optimale sous `package.json` :

```bash
npm run build
```

*Cette commande compile le React SPA sous `/dist` et bundle le serveur NodeJS en un seul fichier CJS hautement optimisé sous `dist/server.cjs`.*

---

## 🔄 Étape 6 : Configuration de PM2 (Processus d'Arrière-Plan)

Installez PM2 de manière globale pour superviser l'application et la lancer automatiquement au démarrage de votre Debian 12 :

```bash
sudo npm install -y -g pm2

# Lancement de l'application backend
pm2 start dist/server.cjs --name "resifaso" --env PORT=3000 --env NODE_ENV=production

# Sauvegarde de la liste pour les redémarrages automatiques de debian
pm2 save

# Configuration du service de démarrage système
pm2 startup systemd
```
*(Copiez et exécutez la commande générée à l'écran par `pm2 startup` avec vos privilèges sudo).*

---

## 🌐 Étape 7 : Configuration de Nginx en Reverse Proxy

Pour rendre votre plateforme accessible sur le réseau local ou via un nom de domaine (sans devoir saisir le port `:3000` à la fin de l'URL), configurez Nginx :

```bash
sudo nano /etc/nginx/sites-available/resifaso
```

Collez la configuration suivante (ajustez le paramètre `server_name` avec votre nom de domaine ou adresse IP locale) :

```nginx
server {
    listen 80;
    server_name resifaso.local 192.168.1.100; # Remplacez par votre IP locale ou domaine

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Activez le site et redémarrez Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/resifaso /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default # Désactiver la configuration par défaut si nécessaire
sudo nginx -t # On teste la syntaxe
sudo systemctl restart nginx
```

---

## 🔒 Étape 8 : Firewall et Sécurité (Optionnel)

Si vous avez activé le pare-feu `ufw` ou `nftables` sur Debian 12, autorisez le trafic HTTP/HTTPS :

```bash
sudo ufw allow 'Nginx Full'
```

---

## 📈 Commandes Utiles au Quotidien

- **Consulter les logs temps réel du serveur** : `pm2 logs resifaso`
- **Redémarrer l'application** : `pm2 restart resifaso`
- **Vérifier l'état d'activité** : `pm2 status`
- **Consulter les erreurs Nginx** : `sudo tail -f /var/log/nginx/error.log`

Votre serveur local Debian 12 est maintenant entièrement configuré et optimisé pour faire fonctionner la passerelle OTP Sappay et l'application RESIFASO !
