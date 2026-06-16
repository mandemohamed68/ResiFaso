# 🚀 GUIDE COMPLET DE DÉPLOIEMENT : Debian 12 + MariaDB Partitionné + PM2 (Port 5000)

Ce fichier vous guide pas à pas dans l'hébergement de votre application sur un serveur brut **Debian 12** de manière 100% autonome, en connectant directement l'application à une base de données **MariaDB locale et partitionnée**, pilotée par un gestionnaire de processus **PM2** unifié sur le **port 5000**.

---

## 🛑 COMPRENDRE & ÉVITER L'ERREUR DE PORT DÉJÀ UTILISÉ (EADDRINUSE:5000)

Dans votre configuration précédente, vous avez probablement rencontré cette erreur :
`Error: listen EADDRINUSE: address already in use 0.0.0.0:5000`

**Pourquoi cela arrive-t-il ?**
Cette erreur survient lorsque deux programmes tentent d'écouter simultanément sur le même port (**5000**). Par exemple :
1. Nginx est configuré pour écouter sur le port `5000`.
2. Votre application Node.js (via PM2) tente également d'écouter sur le port `5000` de l'adresse globale `0.0.0.0`.

### 🛡️ La solution unifiée et robuste (Node à 127.0.0.1:5000 et Nginx à l'écoute publique) :
Pour éviter tout conflit :
* **Votre application Node.js** est configurée pour écouter localement sur le port `5000` (`127.0.0.1:5000`).
* **Nginx** écoute publiquement sur le port `5000` (ou port web standard `80`) et retransmet le trafic de façon transparente à l'application Node en local.
* Alternativement, si vous n'utilisez pas Nginx, vous pouvez faire écouter Node directement sur `0.0.0.0:5000` sans activer Nginx sur ce port.

---

## 🛠️ ÉTAPE 1 : Préparation du Serveur Debian 12

Connectez-vous à votre serveur en tant que `root` :
```bash
ssh root@41.78.54.60
```

Mettez à jour les paquets et installez les outils de base :
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git wget build-essential unzip nano ufw lsof
```

Ouvrez les ports nécessaires sur le pare-feu (UFW) :
```bash
sudo ufw allow "OpenSSH"
sudo ufw allow 5000/tcp # Port unique de l'application
sudo ufw allow 80/tcp   # Port web standard
sudo ufw enable
```

---

## 🟢 ÉTAPE 2 : Installation de Node.js v20 et PM2

Installez Node.js en version stable v20 :
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Installez **PM2** globalement pour gérer l'exécution permanente de votre application :
```bash
sudo npm install -g pm2
```

---

## 🗄️ ÉTAPE 3 : Installation de MariaDB et Importation du Schéma Partitionné

1. **Installer le serveur MariaDB :**
```bash
sudo apt install -y mariadb-server
```

2. **Sécuriser l'installation :**
```bash
sudo mysql_secure_installation
```
*(Définissez votre mot de passe administrateur principal `mm@27071986@` et validez par `Y` aux étapes de sécurité).*

3. **Créer la Base de Données et l'Utilisateur :**
```bash
sudo mysql -u root -p
```
Collez ces requêtes SQL dans la console MariaDB :
```sql
CREATE DATABASE IF NOT EXISTS resifaso_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'resifaso_user'@'localhost' IDENTIFIED BY 'mm@27071986@';
GRANT ALL PRIVILEGES ON resifaso_db.* TO 'resifaso_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

4. **Importer le Schéma de données PARTITIONNÉ :**
L'application utilise un schéma SQL partitionné par clés (`PARTITION BY KEY`) présent dans le fichier `resifaso_schema.sql` pour garantir des temps de réponse ultra-rapides sur les tables volumineuses (`bookings`, `users`, `residences`).
```bash
# Se placer à la racine du projet déployé, puis importer :
mysql -u resifaso_user -p resifaso_db < /var/www/resifaso/resifaso_schema.sql
```

---

## 📂 ÉTAPE 4 : Déploiement du Code Source et Configuration de l'Environnement

1. **Créer le dossier de l'application :**
```bash
sudo mkdir -p /var/www/resifaso
sudo chown -R $USER:$USER /var/www/resifaso
cd /var/www/resifaso
```

2. **Transférer les fichiers du projet :**
Une fois vos fichiers extraits dans `/var/www/resifaso/` (contenant le `package.json`, `ecosystem.config.js`, `src/`, etc.), vérifiez leur présence :
```bash
ls -la
```

3. **Configurer votre fichier `.env` sur le serveur :**
Générez votre fichier de production à partir du modèle :
```bash
cp .env.example .env
nano .env
```
Assurez-vous d'avoir exactement ces valeurs de configuration pour le port local :
```env
PORT=5000
VITE_API_URL=http://41.78.54.60:5000/api
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=resifaso_user
DB_PASSWORD=mm@27071986@
DB_NAME=resifaso_db
```

---

## 🚀 ÉTAPE 5 : Lancement Industriel via PM2 et `ecosystem.config.js`

Pour éviter de lancer manuellement avec npm, nous utilisons le fichier `ecosystem.config.js` pré-configuré à la racine de votre projet.


### 🚨 Libérer le port 5000 en cas d'erreur de démarrage :
Si vous obtenez toujours `EADDRINUSE: address already in use 0.0.0.0:5000`, exécutez ces commandes pour forcer l'arrêt de tout processus en écoute sur le port 5000 :
```bash
# Identifier et forcer la fermeture du processus occupant le port 5000
sudo fuser -k 5000/tcp
# Ou encore (alternative s'il s'agit d'un processus résiduel PM2) :
pm2 delete all
```

### Lancement avec PM2 :
1. **Installer les paquets et compiler le serveur :**
```bash
npm install
npm run build
```

2. **Démarrer en mode Cluster via l'écosystème :**
```bash
pm2 start ecosystem.config.js
```

3. **Sauvegarder l'état pour que PM2 relance l'application en cas de redémarrage système :**
```bash
pm2 save
pm2 startup
```

---

## 🌐 ÉTAPE 6 : Configuration de Nginx pour router le Trafic

Nginx agit comme un bouclier performant et gère les requêtes entrantes sur le port public **5000** en les transmettant au port local **5000** géré par PM2.

1. **Installer Nginx :**
```bash
sudo apt install -y nginx
```

2. **Créer ou modifier la configuration du bloc de routage :**
```bash
sudo nano /etc/nginx/sites-available/resifaso
```
Collez la configuration suivante (Nginx écoute le port public **5000** et le relaie à l'adresse interne localisée `127.0.0.1:5000`) :
```nginx
server {
    listen 5000;
    server_name 41.78.54.60;

    # Augmenter la taille maximale des téléversements (ex: photos de résidences)
    client_max_body_size 20M;

    location / {
        # Transmet le trafic de façon sécurisée à PM2 qui écoute sur l'adresse de bouclage locale
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Configuration de la mise en cache agressive des contenus statiques images/js/css
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /var/www/resifaso/dist;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

3. **Activer la configuration et redémarrer Nginx :**
```bash
sudo ln -sf /etc/nginx/sites-available/resifaso /etc/nginx/sites-enabled/
# Tester l'intégrité de la syntaxe
sudo nginx -t
# Redémarrer
sudo systemctl restart nginx
```

🎉 Votre serveur est prêt, connecté à MariaDB avec une base de données partitionnée hautes performances, et accessible sur le **port 5000** !
