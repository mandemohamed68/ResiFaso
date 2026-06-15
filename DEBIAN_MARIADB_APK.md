# 🚀 Guide Complet : Debian 12 + MariaDB + Génération APK

Ce guide décrit en détail les étapes pour préparer votre serveur local sous **Debian 12**, installer la base de données **MariaDB**, et enfin **générer l'application mobile (APK)** pour Android.

⚠️ **Note Importante sur la Base de Données** : 
L'application utilise actuellement **Firebase (Firestore)** comme base de données cloud. Pour la basculer sur votre MariaDB local, une migration du code backend (`server.ts`) vers un ORM comme Prisma ou Drizzle est nécessaire pour relier MariaDB. Les instructions ci-dessous préparent votre serveur pour cet usage.

---

## 🛠️ Partie 1 : Déploiement du Serveur Web et MariaDB sur Debian 12

### 1. Prérequis et Installation de Node.js v20
Sur votre serveur Debian 12, ouvrez un terminal et exécutez :
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx

# Installation de Node.js v20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Installation et Configuration de MariaDB
```bash
# Installez le serveur de base de données MariaDB
sudo apt install -y mariadb-server

# Sécurisez votre installation (définissez un mot de passe root fort)
sudo mysql_secure_installation

# Connectez-vous à MariaDB pour créer la base de l'application
sudo mysql -u root -p
```
*Dans le terminal MariaDB, exécutez les commandes suivantes :*
```sql
CREATE DATABASE resifaso_db;
CREATE USER 'resifaso_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON resifaso_db.* TO 'resifaso_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Importer la structure de la base de données (.SQL)
Un fichier `resifaso_schema.sql` a été généré à la racine de votre projet. Il contient toute la structure des tables (users, residences, bookings, etc.).

Pour l'importer dans MariaDB, voici la ligne de commande à utiliser depuis votre terminal Debian :
```bash
mysql -u resifaso_user -p resifaso_db < /chemin/vers/votre/projet/resifaso_schema.sql
```
*(Remplacez `/chemin/vers/votre/projet/` par le bon chemin, ex: `/var/www/resifaso/var/www/resifaso_schema.sql`)*

### 5. Migration du Backend (Note Importante)
Placez le projet sous `/var/www/resifaso` :
```bash
sudo mkdir -p /var/www/resifaso
sudo chown -R $USER:$USER /var/www/resifaso
cd /var/www/resifaso

# Installez les dépendances
npm install

# Compilez le projet
npm run build
```

*(La configuration PM2 et NGINX reste identique pour faire écouter l'application en arrière-plan sur le port 80)*.

---

## 📱 Partie 2 : Génération de l'application Android (APK)

L'application est prête à être portée sur Android grâce à **Capacitor**. Le projet inclut déjà une configuration locale.

### Étape 1 : Prérequis sur votre poste de développement
La génération de l'APK (Android) **ne se fait généralement pas sur le serveur Debian en ligne de commande pure**, mais sur votre ordinateur de développement (Windows/Mac/Linux) disposant d'une interface graphique.

1. Installez **Android Studio** depuis le [site officiel](https://developer.android.com/studio).
2. Ouvrez Android Studio, allez dans les outils (SDK Manager) et assurez-vous d'avoir installé :
   - Android SDK
   - Android SDK Command-line Tools

### Étape 2 : Préparation du projet Capacitor
Depuis la racine du projet (sur votre machine de développement locale) :

```bash
# 1. Compilez le projet web (les fichiers vont dans /dist)
npm run build

# 2. Ajoutez de l'environnement Android s'il n'existe pas déjà
npm run mobile:add

# 3. Synchronisez les fichiers web (React) vers le projet natif Android
npm run mobile:build
```

### Étape 3 : Configuration du serveur cible pour l'application Mobile
Avant de générer l'APK, assurez-vous de configurer votre fichier `capacitor.config.json` afin qu'il communique avec votre propre nom de domaine. *(Ignorez cette étape si vous voulez que l'application s'exécute de façon autonome 100% hors-ligne).*

```json
{
  "appId": "com.dev.resifaso",
  "appName": "react-example",
  "webDir": "dist",
  "server": {
    "url": "http://IP_DE_VOTRE_DEBIAN_OU_DOMAINE",
    "cleartext": true
  }
}
```

### Étape 4 : Génération de l'APK avec Android Studio
1. Lancez Android Studio en l'ouvrant via Capacitor :
```bash
npm run mobile:open
```

2. Une fois **Android Studio** démarré :
   - Attendez que l'indexation Gradle se termine en bas à droite.
   - Cliquez dans le menu supérieur sur **"Build"** > **"Build Bundle(s) / APK(s)"** > **"Build APK(s)"**.
   - Android Studio va compiler votre application. Une fois terminé (1-3 minutes), une pop-up apparaîtra en bas à droite : cliquez sur **"locate"** (ou allez dans `android/app/build/outputs/apk/debug/`).
   - Le fichier `app-debug.apk` généré est prêt à être copié et installé sur n'importe quel smartphone Android ! 🚀

*(Pour le publier sur le Play Store, il faut plutôt sélectionner **Build > Generate Signed Bundle / APK...** pour générer une version Release signée).*
