# BusTracker Administration

Portail React séparé pour administrer la base SQLite de `tracking-bus-h` :
trajets, bus, comptes (administrateurs, parents, chauffeurs et assistantes),
enfants et affectations bus/trajet/personnel.

## Démarrage

Dans un premier terminal, lancer l'API et la base SQLite :

```powershell
cd C:\Users\pc\Desktop\local\tracking-bus-h
npm start
```

Dans un second terminal :

```powershell
cd C:\Users\pc\Desktop\local\nouv\BusTrackerAdmin-main
npm install
npm start
```

Ouvrir `http://localhost:3002`. Le compte de démonstration est
`admin@demo.tn` / `demo1234`.

Pour une API hébergée ailleurs, créer un fichier `.env` contenant :

```env
REACT_APP_API_URL=http://adresse-du-serveur:9000/api
```
