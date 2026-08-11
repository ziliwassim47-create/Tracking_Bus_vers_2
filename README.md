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

Le dépôt regroupe également les applications complémentaires :

- `BusTrackerAdmin-main` : portail React d'administration ;
- `BusTrackerFront-end-main` : espace Parent React ;
- `BusTrackerMobile-main` : application mobile Expo/React Native ;
- `BusTrackerBack-main` : ancien backend MySQL, conservé pour compatibilité.

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

### Administration React

Installer les dépendances une première fois :

```bat
npm.cmd install
npm.cmd --prefix BusTrackerAdmin-main install
```

Puis lancer simultanément l'API et le portail Admin :

```bat
npm.cmd run start:admin
```

Ouvrir <http://localhost:3002>. Cette commande démarre aussi l'API attendue sur
<http://localhost:9000> et évite les erreurs `ERR_CONNECTION_REFUSED`.

### Espace Parent React

```bat
npm.cmd --prefix BusTrackerFront-end-main install
npm.cmd run start:parent
```

Ouvrir <http://localhost:3000>.

La base est créée dans `data/tracking-bus.sqlite`. Pour la réinitialiser:

```bat
npm.cmd run db:reset
```

### Application mobile Expo

```bat
npm.cmd --prefix BusTrackerMobile-main install
npm.cmd --prefix BusTrackerMobile-main run web
```

L’application utilise `http://localhost:9000` par défaut. Sur un téléphone
physique, définir `EXPO_PUBLIC_SERVER_URL=http://IP_LOCALE_DU_PC:9000` avant de
lancer Expo.

## Comptes de démonstration

| Rôle | Téléphone | Email | Mot de passe |
|---|---|---|---|
| Parent | `20200200` | `parent@demo.tn` | `demo1234` |
| Assistante | `20400400` | `assistant@demo.tn` | `demo1234` |
| Chauffeur | `20300300` | `chauffeur@demo.tn` | `demo1234` |
| Administration | `20100100` | `admin@demo.tn` | `demo1234` |

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
