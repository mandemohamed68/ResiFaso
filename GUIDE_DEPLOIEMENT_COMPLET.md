# 🚀 GUIDE COMPLET DE DÉPLOIEMENT : Debian 12 + MariaDB + Web + APK Android

Ce fichier contient l'intégralité des étapes nécessaires pour configurer votre serveur brut **Debian 12**, installer la base de données **MariaDB**, déployer l'application Web, et générer l'application mobile Android (**APK**).

---

## 🛑 PRÉREQUIS IMPORTANTS À LIRE AVANT DE COMMENCER
L'application actuelle est codée en React et utilise **Firebase** pour la base de données (Firestore) et l'authentification. 
Pour utiliser **MariaDB** de façon 100% autonome et locale sur votre propre serveur, **vous devrez modifier le code source** pour créer un dossier backend local (API Node.js/Express) qui ira lire/écrire dans la base de données MariaDB via la structure que nous avons créée. 

Le guide ci-dessous prépare tout le terrain pour cette transition.

---

## 🛠️ ÉTAPE 1 : Préparation du Serveur Debian 12

Connectez-vous à votre serveur Debian 12 via SSH :
```bash
ssh root@IP_DE_VOTRE_SERVEUR
```

Mettez à jour le système et installez les outils de base :
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git wget build-essential unzip nano ufw
```

Configurez le pare-feu (UFW) pour autoriser le web et SSH :
```bash
sudo ufw allow "OpenSSH"
sudo ufw allow "Nginx Full"
sudo ufw enable
```

---

## 🟢 ÉTAPE 2 : Installation de Node.js v20 et PM2

L'application React/Node nécessite Node.js pour être compilée et servie.

```bash
# Ajouter le dépôt NodeSource pour la version 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installer Node.js
sudo apt install -y nodejs

# Installer PM2 (pour gérer les processus en arrière-plan) et yarn/pnpm si besoin
sudo npm install -g pm2
```

---

## 🗄️ ÉTAPE 3 : Installation et Configuration de MariaDB

1. **Installer le serveur MariaDB :**
```bash
sudo apt install -y mariadb-server
```

2. **Sécuriser l'installation :**
```bash
sudo mysql_secure_installation
```
*(Répondez **Y** à presque tout : définir un mot de passe root, supprimer les utilisateurs anonymes, désactiver le login root à distance, supprimer la table de test).*

3. **Créer la Base de Données et l'Utilisateur pour Résifaso :**
```bash
sudo mysql -u root -p
```
Une fois connecté à MariaDB (`MariaDB [(none)]>`), tapez exactement ceci :
```sql
CREATE DATABASE resifaso_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'resifaso_user'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_TRES_FORT_ICI';
GRANT ALL PRIVILEGES ON resifaso_db.* TO 'resifaso_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

4. **Importer le schéma et les données SQL :**
Utilisez le fichier `resifaso_dump_exported.sql` (qui contient TOUTES les données actuelles : utilisateurs, résidences, images, réservations) et importez-le dans MariaDB :
```bash
# Assurez-vous d'avoir transféré le fichier sur votre serveur
mysql -u resifaso_user -p resifaso_db < resifaso_dump_exported.sql
```
*Note : Vous pouvez générer un nouveau dump à tout moment depuis l'interface Admin > Maintenance.*

---

## 📂 ÉTAPE 4 : Déploiement du Code Source de l'Application

⚠️ **L'erreur courante "Could not read package.json / ENOENT" se produit lorsque vous essayez de faire "npm install" dans un dossier vide !** Vous devez d'abord transférer tout le code source de AI Studio vers votre serveur Debian.

1. **Créer le dossier d'hébergement :**
```bash
sudo mkdir -p /var/www/resifaso
# IMPORTANT : Remplacez $USER par "root" ou le nom d'utilisateur avec lequel vous êtes connecté sur votre Debian (ex: "debian" ou "ubuntu").
sudo chown -R $USER:$USER /var/www/resifaso
cd /var/www/resifaso
```

2. **Transférer votre code web vers le serveur (CRUCIAL) :**
Votre dossier `/var/www/resifaso` est vide à cette étape. Vous devez y transférer les fichiers.

* **Méthode A (Depuis l'interface AI Studio ou votre PC) :**
  1. Si vous êtes sur AI Studio, cliquez sur la roue crantée (Settings) et choisissez **"Export to ZIP"** ou **"Export to GitHub"**.
  2. Sur votre ordinateur personnel, téléchargez un petit logiciel comme **FileZilla** ou **WinSCP**.
  3. Connectez-vous à l'IP de votre serveur avec l'identifiant "root" et votre mot de passe (en SFTP).
  4. Transférez TOUS les fichiers décompressés du projet (dont le fichier `package.json`, le dossier `src`, etc.) DANS le dossier `/var/www/resifaso/` du serveur Debian.

* **Méthode B (Via Git) :**
  Si vous avez choisi "Export to GitHub" depuis AI Studio, vous pouvez cloner le projet directement depuis le serveur :
  ```bash
  # Mettez le lien de votre dépôt GitHub et n'oubliez pas le L'ESPACE ET LE POINT "." à la fin
  git clone https://github.com/VOTRE_COMPTE/NOM_DU_PROJET.git .
  ```

3. **Vérifier la présence des fichiers :**
```bash
ls -la /var/www/resifaso/
```
*(Si vous ne voyez pas "package.json", retournez à l'étape 2. Ne continuez pas !)*

4. **Configurer l'environnement via .env :**
```bash
cd /var/www/resifaso
cp .env.example .env
nano .env
```
*(Assurez-vous que `PORT=3000` (pour Node en interne) et que `VITE_API_URL=https://resifaso.net`)*.

5. **Installer les dépendances et compiler :**
```bash
cd /var/www/resifaso
npm install
npm run build
```

6. **Lancer le serveur Node (en arrière-plan sur le port 3000) :**
```bash
pm2 start npm --name "resifaso" -- run start
pm2 save
pm2 startup
```
*(Nginx écoutera sur le port 80 / 443 (HTTPS resifaso.net) publiquement et transmettra au port 3000 local).*

---

## 🌐 ÉTAPE 5 : Configuration de Nginx & Certbot HTTPS (https://resifaso.net)

> ⚠️ **IMPORTANT SI VOUS AVEZ PLUSIEURS SITES SUR LE MÊME SERVEUR (ex: ResiFaso + FasoExpress) :**
> Si `resifaso.net` affiche la page de **FasoExpress**, c'est parce que Nginx renvoie vers le site par défaut ("default_server") ou que les deux projets utilisent le même port interne (ex: 3000).
>
> **Solution pour séparer les 2 plateformes :**
> 1. **Distinguer les ports PM2 :**
>    - **ResiFaso** tourne sur le port `3000` (`PORT=3000` dans `.env`).
>    - **FasoExpress** tourne sur le port `3001` (ou un autre port, ex: `2000`).
> 2. **Supprimer le fichier par défaut Nginx** pour éviter que tout trafic non reconnu pointe sur FasoExpress :
>    ```bash
>    sudo rm /etc/nginx/sites-enabled/default
>    ```

1. **Installer Nginx & Certbot :**
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

2. **Créer le bloc Nginx spécifique pour ResiFaso :**
```bash
sudo nano /etc/nginx/sites-available/resifaso
```
Collez cette configuration (seule `resifaso.net` sera interceptée ici) :
```nginx
server {
    listen 80;
    server_name resifaso.net www.resifaso.net;
    
    location / {
        # Transmet le trafic vers le port 3000 de ResiFaso
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Configuration du cache pour les assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

3. **Créer le bloc Nginx séparé pour FasoExpress (si applicable) :**
```bash
sudo nano /etc/nginx/sites-available/fasoexpress
```
```nginx
server {
    listen 80;
    server_name fasoexpress.net www.fasoexpress.net;

    location / {
        # Transmet le trafic vers le port de FasoExpress (ex: 3001 ou 2000)
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Activer les sites et générer les certificats SSL HTTPS :**
```bash
# Activer ResiFaso et FasoExpress
sudo ln -sf /etc/nginx/sites-available/resifaso /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/fasoexpress /etc/nginx/sites-enabled/

# Vérifier la syntaxe et redémarrer Nginx
sudo nginx -t
sudo systemctl restart nginx

# Générer les certificats SSL HTTPS gratuits séparément
sudo certbot --nginx -d resifaso.net -d www.resifaso.net
sudo certbot --nginx -d fasoexpress.net -d www.fasoexpress.net
```
🎉 Désormais, **https://resifaso.net** affichera uniquement ResiFaso, et **https://fasoexpress.net** affichera uniquement FasoExpress !

---

## 📱 ÉTAPE 6 : Génération et Exportation de l'Application Mobile (APK Android)

La génération de l'APK (Android) **ne se fait pas sur votre serveur Debian (qui n'a pas d'interface graphique)**. Elle se fait sur votre ordinateur personnel (celui sur lequel vous codez : Windows / Mac / Ubuntu Desktop).

### 1. Prérequis sur votre PC
* Avoir **Node.js** d'installé.
* Avoir téléchargé **Android Studio** (depuis le site développeur Google) avec le SDK Android configuré.

### 2. Initialiser le projet Capacitor (sur votre PC)
Dans le dossier de votre projet sur votre PC, ouvrez un terminal :
```bash
# Remplacer les identifiants Firebase par vos vrais URLs (si non fait)
npm run build

# Installer les dépendances Capacitor
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli

# Initialiser Capacitor (si ce n'est pas encore fait)
npx cap init ResiFaso com.resifaso.app --web-dir dist

# Ajouter la plateforme Android
npx cap add android
```

### 3. Synchroniser et compiler l'APK
```bash
# Copier les derniers fichiers Web (.html, .js compilés) dans le dossier Android
npx cap sync android

# Ouvrir Android Studio automatiquement
npx cap open android
```

### 4. Dans Android Studio :
1. Une fois ouvert, attendez que la barre de progression (en bas) indique que `Gradle Sync` est terminé.
2. Allez dans le menu en haut : **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Le processus prend quelques minutes. Une notification apparaîtra en bas à droite une fois fini.
4. Cliquez sur **Locate** dans cette notification.
5. Vous trouverez votre fichier `app-debug.apk` généré.
6. Copiez ce fichier sur votre téléphone Android et installez-le. (Pensez à autoriser l'installation provenant de sources inconnues).

> **Important pour l'APK :** Dans votre code React, tous vos appels API doivent pointer vers le lien en `https://votredomaine.com` (votre serveur Debian) et non pas sur `localhost`, car le téléphone cherchera l'API sur son propre réseau plutôt que sur votre serveur.
