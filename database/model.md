# Modèle métier en français

Le serveur utilise SQLite. Le modèle reprend les entités du schéma métier
fourni et conserve les extensions nécessaires au suivi GPS, aux affectations
historiques et aux demandes d'inscription.

```mermaid
classDiagram
  class Utilisateur {
    int id
    int identifiant
    string motDePasse
    string email
    string telephone
    string typeCompte
    string prenom
    string nom
    bool actif
  }
  class Parent
  class Administrateur
  class Chauffeur {
    string numeroPermis
    date dateExpirationPermis
  }
  class Assistante
  class Bus {
    string matricule
    int capacite
    string statut
  }
  class Etablissement {
    string nom
  }
  class Trajet {
    string code
    string nomTrajet
    string origine
    string destination
    float tempsTotalEstime
  }
  class Arret {
    string nom
    float estimationTemps
    int ordreArret
  }
  class Enfant {
    string prenom
    string nom
    string classe
  }
  class Affectation
  class ExecutionTrajet
  class ArretExecution
  class PresenceEnfant
  class PositionGPS
  class Incident
  class Reclamation
  class Notification
  class DemandeInscription

  Utilisateur <|-- Parent
  Utilisateur <|-- Administrateur
  Utilisateur <|-- Chauffeur
  Utilisateur <|-- Assistante
  Parent "1" --> "*" Enfant
  Etablissement "1" --> "*" Enfant
  Trajet "1" --> "*" Arret
  Trajet "*" --> "*" Enfant : TrajetEnfant
  Affectation "*" --> "1" Trajet
  Affectation "*" --> "1" Bus
  Affectation "*" --> "1" Chauffeur
  Affectation "*" --> "0..1" Assistante
  ExecutionTrajet "*" --> "1" Trajet
  ExecutionTrajet "*" --> "1" Bus
  ExecutionTrajet "1" --> "*" ArretExecution
  ExecutionTrajet "1" --> "*" PresenceEnfant
  ExecutionTrajet "1" --> "*" PositionGPS
  Utilisateur "1" --> "*" Notification
  Utilisateur "1" --> "*" Incident : signale
```

## Correspondance fonctionnelle

| Fonction | Tables principales |
|---|---|
| Comptes et authentification | `Utilisateur`, `Parent`, `Administrateur`, `Chauffeur`, `Assistante` |
| Enfants et établissements | `Enfant`, `Etablissement` |
| Bus, trajets et arrêts | `Bus`, `Trajet`, `Arret` |
| Affectations | `Affectation`, `TrajetEnfant` |
| Exécution et présence | `ExecutionTrajet`, `ArretExecution`, `PresenceEnfant` |
| Localisation | `PositionGPS` |
| Communication | `Notification`, `Incident`, `Reclamation` |
| Inscriptions | `DemandeInscription` |

Les clés étrangères sont activées, les statuts sont limités par des contraintes
`CHECK`, et une seule affectation active est autorisée par trajet.
