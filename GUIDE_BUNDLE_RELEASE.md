# 📱 GUIDE DE PRÉPARATION ET GÉNÉRATION DU BUNDLE RELEASE (.aab / .apk) - RESIFASO

Ce guide explique comment générer un **Bundle Release Android App Bundle (.aab)** prêt pour la publication sur le **Google Play Store**, ainsi que l'APK de Release et le paquet Web de production.

---

## 🚀 ÉTAPE 1 : Préparation & Synchronisation des Fichiers Web

Exécutez la commande suivante à la racine du projet pour compiler l'application web React/Vite et synchroniser le code natif Android :

```bash
# 1. Préparer les icônes et splash screens mobiles
npm run mobile:assets

# 2. Compiler l'application Web & Synchroniser avec Capacitor Android
npm run mobile:build
```

---

## 🛠️ ÉTAPE 2 : Méthodes de Génération du Bundle Release (.aab / .apk)

### 📌 Méthode A : Génération Automatique via GitHub Actions (Recommandé)
Le projet contient le workflow automatique `.github/workflows/android-release.yml`.
1. Effectuez un `git push` de votre code sur GitHub ou créez une version (*Release/Tag*).
2. Rendez-vous dans l'onglet **Actions** de votre dépôt GitHub.
3. Téléchargez directement les fichiers générés :
   - `resifaso-release-aab` (Fichier `.aab` pour le Play Store)
   - `resifaso-release-apk` (Fichier `.apk` d'installation directe)

---

### 📌 Méthode B : Ligne de Commande Locale (Terminal PC)

Si Java JDK 17+ et Android SDK sont installés sur votre ordinateur :

```bash
# Générer le Bundle Android App Bundle (.aab) pour Google Play Store
npm run mobile:bundle

# Générer l'APK de Release
npm run mobile:apk

# Générer les deux simultanément (.aab + .apk)
npm run mobile:release
```

Les fichiers générés se trouvent dans :
- **Android App Bundle (.aab)** : `android/app/build/outputs/bundle/release/app-release.aab`
- **APK Release (.apk)** : `android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

### 📌 Méthode C : Via Android Studio (Interface Graphique)

1. Ouvrez le projet dans Android Studio :
   ```bash
   npm run mobile:open
   ```
2. Attendez la fin de la synchronisation Gradle (*Gradle Sync Finished*).
3. Dans le menu supérieur, allez dans :
   **Build** ➔ **Generate Signed Bundle / APK...**
4. Choisissez **Android App Bundle (.aab)** puis cliquez sur **Next**.
5. Sélectionnez votre clé de signature (`keystore.jks`) ou créez-en une nouvelle (*Create new...*).
6. Sélectionnez le mode **release** puis cliquez sur **Create**.

---

## 🔑 ÉTAPE 3 : Création d'une Clé de Signature (Keystore pour le Play Store)

Pour publier l'application sur le Google Play Store, vous devez signer le bundle avec une clé `.jks` :

```bash
keytool -genkey -v -keystore resifaso-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias resifaso-key
```

Configurez ensuite la signature dans `android/app/build.gradle` ou fournissez la clé lors de l'exportation dans Android Studio.

---

## 🌐 ÉTAPE 4 : Bundle Web de Production (Serveur Debian / Nginx)

Pour générer le paquet Web complet (Frontend + Serveur Node.js CJS) pour votre serveur de production :

```bash
npm run build
```

Le dossier `dist/` contiendra :
- `dist/index.html` et les assets statiques minifiés
- `dist/server.cjs` (Le serveur backend optimisé et bundled)
