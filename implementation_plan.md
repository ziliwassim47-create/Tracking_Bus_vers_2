# Ajout du module Parent — Suivi des enfants dans BusTrackerMobile-main

## Contexte

Le projet `BusTrackerMobile-main` est une app React Native pour les **chauffeurs/assistants** scolaires.
Le projet `tracking-bus-h` contient un espace **Parent** (PWA web) avec :
- Sélecteur d'enfants (childSwitcher)
- Carte en direct (bus + arrêt de l'enfant)
- Historique des trajets
- Notifications
- Réclamations
- Profil parent

L'objectif est d'intégrer ce **concept Parent séparé** dans l'app mobile, avec ses propres écrans distincts des écrans chauffeur.

---

## User Review Required

> [!IMPORTANT]
> L'app actuelle n'a **pas de vraie authentification par rôle**. Le login accepte tout. 
> Le module Parent nécessite un rôle `PARENT` renvoyé par le backend (`/api/auth/login`).
> Pour l'instant, on ajoutera un **sélecteur de rôle** sur l'écran de login (Chauffeur / Parent).

> [!WARNING]
> Le backend actuel (`http://51.91.249.6:4321/api`) doit exposer les endpoints :
> - `GET /api/parent/children` — liste des enfants du parent connecté
> - `GET /api/parent/trips` — historique des trajets
> - `GET /api/parent/notifications` — notifications
> - `GET /api/parent/bus-position` — position temps réel du bus
>
> **Si ces endpoints n'existent pas, les données seront mockées / simulées.**

---

## Open Questions

> [!IMPORTANT]
> Le backend `tracking-bus-h` utilise une auth par JWT (token Bearer). 
> L'app mobile utilise un login simplifié sans token. Doit-on connecter les deux backends, 
> ou utiliser des **données mockées** pour la démo parent ?

---

## Proposed Changes

### 1. Navigation & Types

---

#### [MODIFY] [App.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/App.tsx)
- Ajouter les routes du module Parent dans `RootStackParamList`
- Ajouter les nouveaux écrans dans le `Stack.Navigator`
- Routes ajoutées : `ParentHome`, `ParentMap`, `ParentHistory`, `ParentNotifications`, `ParentProfile`, `ParentClaim`

---

#### [MODIFY] [LoginScreen.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/screens/LoginScreen.tsx)
- Ajouter un **sélecteur de rôle** (Chauffeur 🚌 / Parent 👨‍👩‍👦)
- Si rôle = Parent → naviguer vers `ParentHome`
- Si rôle = Chauffeur → naviguer vers `List` (comportement actuel)

---

### 2. Nouveaux écrans Parent

---

#### [NEW] [screens/parent/ParentHomeScreen.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/screens/parent/ParentHomeScreen.tsx)
Écran d'accueil Parent :
- Header avec nom du parent et avatar
- **ChildSwitcher** — sélecteur d'enfant horizontal (cartes cliquables)
- Résumé du trajet en cours (bus, chauffeur, heure de départ)
- Grille d'actions : Carte, Trajet, Historique, Notifications, Réclamation
- Design : fond dégradé, cartes glassmorphism, couleurs teal/violet

#### [NEW] [screens/parent/ParentMapScreen.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/screens/parent/ParentMapScreen.tsx)
Carte en direct :
- WebView avec OpenStreetMap / Leaflet (réutilise le concept de `carte.html`)
- Affiche position du bus (icône animée) + arrêt de l'enfant sélectionné
- Métriques : Distance, ETA, Vitesse
- Actualisation automatique (polling toutes les 10s ou WebSocket)

#### [NEW] [screens/parent/ParentHistoryScreen.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/screens/parent/ParentHistoryScreen.tsx)
Historique des trajets :
- Liste des trajets terminés avec date, heure, statut (À l'heure / Retard)
- Filtré par enfant sélectionné
- Design timeline avec icônes matin/soir

#### [NEW] [screens/parent/ParentNotificationsScreen.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/screens/parent/ParentNotificationsScreen.tsx)
Notifications :
- Liste des alertes (retard, incident, montée/descente de l'enfant)
- Badge "Nouveau" sur notifications non lues
- Icônes par type de notification

#### [NEW] [screens/parent/ParentClaimScreen.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/screens/parent/ParentClaimScreen.tsx)
Réclamation :
- Formulaire : Catégorie (Retard, Comportement, Véhicule...) + Description
- Soumission vers l'API
- Confirmation visuelle

#### [NEW] [screens/parent/ParentProfileScreen.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/screens/parent/ParentProfileScreen.tsx)
Profil Parent :
- Nom, email, téléphone
- Nombre d'enfants inscrits
- Liste des enfants avec avatar, classe, adresse
- Bouton déconnexion

---

### 3. Contexte partagé

#### [NEW] [context/ParentContext.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/context/ParentContext.tsx)
- Context React pour l'état global Parent :
  - `children` (liste des enfants)
  - `selectedChild` (enfant actif)
  - `busPosition` (position temps réel)
  - `currentTrip` (trajet en cours)
  - `notifications` (liste notifications)
- Fonctions : `selectChild()`, `refreshData()`
- Données mockées réalistes si backend non disponible

---

### 4. Composant commun

#### [NEW] [components/ChildSwitcher.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/components/ChildSwitcher.tsx)
- Sélecteur horizontal d'enfant (ScrollView horizontal)
- Chaque enfant : avatar initiales coloré, prénom, indicateur actif
- Réutilisable dans tous les écrans Parent

#### [NEW] [components/ParentBottomNav.tsx](file:///c:/Users/pc/Desktop/local/nouv/BusTrackerMobile-main/components/ParentBottomNav.tsx)
- Barre de navigation inférieure dédiée Parent
- 5 onglets : Accueil, Carte, Trajet, Notifications, Profil
- Indicateur actif animé

---

## Architecture des écrans

```
Login (rôle sélectionnable)
│
├─── [Chauffeur] → List → Tracking (existant)
│
└─── [Parent] → ParentHome
                ├── ParentMap (Carte live)
                ├── ParentHistory (Historique)
                ├── ParentNotifications (Alertes)
                ├── ParentClaim (Réclamation)
                └── ParentProfile (Profil + enfants)
```

## Verification Plan

### Automated Tests
- `npx react-native start` — vérifier que l'app démarre sans erreur TypeScript

### Manual Verification
1. Login → sélectionner "Parent" → accès au tableau de bord parent
2. Login → sélectionner "Chauffeur" → comportement existant inchangé
3. Sélecteur d'enfant : cliquer sur un enfant change l'affichage
4. Carte : position du bus s'affiche (mockée ou réelle)
5. Historique : liste de trajets filtrée par enfant
6. Notifications : badges et tri
7. Réclamation : formulaire soumis avec succès
8. Profil : infos parent + liste enfants
9. Navigation par bottom nav : transitions fluides
