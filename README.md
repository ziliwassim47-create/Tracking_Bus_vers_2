# Tracking Bus - application hybride dynamique

Application de suivi de bus scolaire compatible navigateur, PWA et Cordova Android.
L'interface reprend le fichier Figma **Tracking Bus Scolaire - React UI Moderne V2**
dans la pile existante HTML/CSS/JavaScript, sans imposer React à l'application Cordova.

## Architecture

- interface responsive plein écran pour le web et adaptée à Cordova;
- serveur HTTP et API JSON en Node.js;
- base SQLite locale, initialisée et migrée automatiquement;
- authentification par jetons à durée limitée, rotation et contrôle des rôles/affectations;
- données dynamiques pour Parent, Chauffeur/Assistante et Administration;
- suivi GPS via `navigator.geolocation` et carte OpenStreetMap;
- mode PWA avec cache des ressources, sans mise en cache des réponses API.

Le modèle relationnel détaillé se trouve dans
[`database/model.md`](database/model.md) et le schéma exécutable dans
[`database/schema.sql`](database/schema.sql).

Le schéma SQLite est intégralement nommé en français. Au premier démarrage,
une ancienne base utilisant les noms anglais est migrée automatiquement sans
perte des utilisateurs, enfants, trajets ou historiques.

## Lancer l'application

```bat
cd /d "CHEMIN\tracking-bus-hybride-standalone"
npm.cmd start
```

Ouvrir <http://localhost:9000>.

La base est créée dans `data/tracking-bus.sqlite`. Pour la réinitialiser:

```bat
npm.cmd run db:reset
```

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Parent | `parent@demo.tn` | `demo1234` |
| Assistante | `assistant@demo.tn` | `demo1234` |
| Chauffeur | `chauffeur@demo.tn` | `demo1234` |
| Administration | `admin@demo.tn` | `demo1234` |

Les nouveaux comptes validés par l'administration reçoivent aussi
`demo1234` comme mot de passe temporaire dans cette version de démonstration.

## Fonctionnalités reliées à SQLite

- demandes d'inscription et validation par l'administration;
- utilisateurs, rôles et profils;
- enfants et relation avec leurs parents;
- bus, lignes, arrêts et inscriptions aux lignes;
- affectations chauffeur, assistante, bus et itinéraire;
- démarrage et fin d'un trajet;
- statuts des élèves pendant un trajet;
- positions GPS historisées;
- notifications et historique des trajets;
- incidents et réclamations avec traitement administratif.

## Android Cordova

Prérequis: Node.js, Cordova CLI, Java JDK et Android Studio/SDK.

```bat
cordova platform add android
cordova build android
```

Les plugins déclarés incluent la barre d'état, la vibration et la géolocalisation.
L'application Android doit pouvoir joindre l'API. Par défaut, une exécution en
protocole `file:` utilise `http://localhost:9000/api`; une autre URL peut être
définie dans `localStorage.trackingApiUrl`.

## Sessions

Le jeton d'accès expire après 15 minutes. Le client le renouvelle avant son
échéance avec un jeton de renouvellement à usage unique; chaque renouvellement
invalide immédiatement les deux anciens jetons. La session complète expire
après 8 heures et impose alors une nouvelle connexion.

Ces durées peuvent être configurées en millisecondes avec
`ACCESS_TOKEN_TTL_MS` et `SESSION_TTL_MS`.
