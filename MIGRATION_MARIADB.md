# MIGRATION VERS MARIADB LORS DU DEPLOIEMENT

Pour que l'application soit **100% locale sans Firebase**, vous devez créer une architecture "Client-Serveur".

## 1. Ce qu'il faut modifier côté Serveur (`server.ts`)
Ouvrez votre fichier `server.ts` et ajoutez les routes API pour remplacer Firebase :

```javascript
import express from "express";
import { db } from "./src/lib/db-mariadb"; // Le fichier que nous venons de créer
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

// Exemple d'API pour la connexion
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await db.auth.login(email);
  if (!user) return res.status(404).send({ error: "Utilisateur non trouvé" });

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return res.status(401).send({ error: "Mot de passe incorrect" });

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || "secret");
  res.send({ token, user });
});

// Exemple d'API pour les résidences
app.get("/api/residences", async (req, res) => {
  const residences = await db.residences.getAll();
  res.send(residences);
});

// Ajoutez ici toutes les autres routes (réservations, ajout de résidences, etc.)
```

## 2. Ce qu'il faut modifier côté Application React (`src/lib/db.ts` et `src/contexts/AuthContext.tsx`)
Actuellement, le frontend React importe `firebase/firestore`. Vous devrez remplacer ce fichier !

**Exemple de remplacement pour `src/lib/db.ts` (Côté Client) :**
```ts
// src/lib/db.ts - NOUVELLE VERSION 100% LOCALE
export async function getAllResidences() {
  const response = await fetch('/api/residences');
  return response.json();
}

export async function addResidence(resData) {
  const response = await fetch('/api/residences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify(resData)
  });
  return response.json();
}
```

## Étapes de travail post-déploiement
1. Assurez-vous d'avoir exécuté la commande SQL (voir guide).
2. Ajoutez toutes les requêtes SQL dans `/src/lib/db-mariadb.ts`.
3. Branchez ces requêtes sur des routes API dans `/server.ts`.
4. Supprimez les imports Firebase de votre dossier frontend `src/` et remplacez les par des appels à votre API (avec `fetch()`).
