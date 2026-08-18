# 🔑 GUIDE COMPLET DE GÉNÉRATION & SIGNATURE RELEASE - RESIFASO

Ce guide vous donne toutes les étapes et commandes pour créer votre **clé de signature de production (Keystore `.jks`)** pour **ResiFaso** (`com.resifaso.app`), extraire les empreintes (**SHA-1** & **SHA-256**) et configurer la signature automatique de votre Bundle Google Play (`.aab`) et APK Release (`.apk`).

---

## ⚡ 1. Commande de Génération de la Clé Release (`keytool`)

Ouvrez un terminal (PowerShell sur Windows, ou Terminal sur macOS / Linux) et lancez la commande suivante :

```bash
keytool -genkey -v -keystore resifaso-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias resifaso-key
```

### 📋 Informations demandées lors de la création :
- **Mot de passe du Keystore** : *Choisissez un mot de passe fort et notez-le précieusement.*
- **Nom et prénom** : `ResiFaso Admin` *(ou votre nom)*
- **Nom de l'organisation / unité** : `ResiFaso Mobile Team`
- **Nom de l'entreprise** : `ResiFaso SARL`
- **Ville / Localité** : `Ouagadougou`
- **État / Province / Région** : `Kadiogo`
- **Code pays (2 lettres)** : `BF`
- **Confirmer (oui/non / yes/no)** : tapez `oui` ou `yes`
- **Mot de passe de la clé** : appuyez sur `Entrée` pour utiliser le même mot de passe que le Keystore.

> ⚠️ **CRITIQUE : Conservez une sauvegarde sécurisée de votre fichier `resifaso-release-key.jks` et de vos mots de passe.** Si vous perdez cette clé, vous ne pourrez plus mettre à jour l'application sur le Google Play Store !

---

## 🔍 2. Extraire les Empreintes SHA-1 et SHA-256 (Firebase, Google Sign-In & Play Store)

Pour connecter Firebase Authentication, Google Sign-In ou le Google Play App Signing, récupérez vos empreintes certifiées avec la commande suivante :

```bash
keytool -list -v -keystore resifaso-release-key.jks -alias resifaso-key
```

Vous obtiendrez les informations suivantes :
- **Alias** : `resifaso-key`
- **SHA1** : `XX:XX:XX:XX:XX:XX:...`
- **SHA256** : `YY:YY:YY:YY:YY:YY:...`

---

## ⚙️ 3. Configuration de la Signature Automatique dans le Projet

1. Copiez votre fichier généré `resifaso-release-key.jks` dans le dossier `android/app/` (ou à la racine du dossier `android/`).
2. Créez un fichier nommé **`key.properties`** dans le dossier `android/` avec le contenu suivant :

```properties
storeFile=resifaso-release-key.jks
storePassword=VOTRE_MOT_DE_PASSE_KEYSTORE
keyAlias=resifaso-key
keyPassword=VOTRE_MOT_DE_PASSE_KEY
```

*(Ce fichier `key.properties` et le fichier `.jks` sont déjà automatiquement ignorés par Git dans `.gitignore` pour protéger vos secrets).*

---

## 🚀 4. Compiler et Signer le Bundle Release (.aab) & l'APK

Une fois `key.properties` et `resifaso-release-key.jks` en place, lancez simplement :

```bash
# 1. Compiler les assets Web & synchroniser
npm run mobile:build

# 2. Générer le Bundle Android App Bundle (.aab) signé pour le Google Play Store
npm run mobile:bundle

# 3. Générer l'APK Release signé pour installation directe
npm run mobile:apk
```

### 📂 Emplacement des fichiers finaux générés :
- **Google Play Store App Bundle (.aab) :** `android/app/build/outputs/bundle/release/app-release.aab`
- **APK Release d'installation directe (.apk) :** `android/app/build/outputs/apk/release/app-release.apk`

---

## 🖥️ 5. Alternative : Signature via l'interface graphique Android Studio

Si vous préférez utiliser l'interface graphique :
1. Ouvrez le projet dans Android Studio :
   ```bash
   npm run mobile:open
   ```
2. Rendez-vous dans le menu **Build** > **Generate Signed Bundle / APK...**
3. Choisissez **Android App Bundle (.aab)** puis cliquez sur **Next**.
4. Cliquez sur **Choose existing...** et sélectionnez votre fichier `resifaso-release-key.jks`.
5. Renseignez l'alias `resifaso-key` et vos mots de passe.
6. Cochez **release** et validez !
