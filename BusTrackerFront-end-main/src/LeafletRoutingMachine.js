import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { useMap } from "react-leaflet";
import { io } from "socket.io-client";
import { API_BASE, SOCKET_URL } from "./utils";

const SOCKET_SERVER_URL = SOCKET_URL;

const LeafletRoutingMachine = () => {
  const map = useMap();
  const [socket, setSocket] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [stopPoint, setStopPoint] = useState(null);
  const [busid, setBusId] = useState(null);
  const [busMarker, setBusMarker] = useState(null);
  const [routingControl, setRoutingControl] = useState(null);
  const [alertShown] = useState(false); 

  const API_URL = `${API_BASE}/user/1`;
  
  useEffect(() => {

    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        console.log(data,'📌');
        setStopPoint(data.adresse);
        setBusId(data.bus);  
        
      })
      .catch(err => console.error(err));
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);
    newSocket.on("connect", () => console.log("✅ Connected to WebSocket server!"));
    newSocket.on("connect_error", (err) => console.error("❌ WebSocket connection error:", err));
  
    return () => newSocket.disconnect();
  }, []);  
     console.log(stopPoint,"🛑🛑🚌🚌✔🛑")
      console.log(busid,"🛺🛺🛺🛺🛺🛺")
  
  useEffect(() => {
   
console.log(map ,socket ,busid)
   if (!map || !socket || !busid) return; 

    let busIcon = L.icon({
      iconUrl: "/bus.gif",
      iconSize: [20, 20],
      iconAnchor: [20, 20],
    });
  
    let startIcon = L.icon({
      iconUrl: "/START.png",
      iconSize: [20, 20],
      iconAnchor: [17, 35],
    });
  
    let stopIcon = L.icon({
      iconUrl: "/STOP.png",
      iconSize: [20, 20],
      iconAnchor: [17, 35],
    });
   

  // Écoute du busLocationStart pour afficher les points de départ et d'arrêt
socket.on("busLocationStart", (data) => {
  console.log("📍 START POINT :", data);
  setStartPoint(data);  

  if (data.latitude && data.longitude) {
    L.marker([data.latitude, data.longitude], { icon: startIcon, draggable: false }).addTo(map);
  }

  // Ajouter le marqueur du point d'arrêt
  if (stopPoint?.latitude && stopPoint?.longitude) {
    L.marker([stopPoint.latitude, stopPoint.longitude], { icon: stopIcon, draggable: false }).addTo(map);
  }

  // Centrer la carte sur le point de départ
  map.setView([data.latitude, data.longitude], 13);

  // Créer l'itinéraire si ce n'est pas déjà fait
  if (data && stopPoint && !routingControl) {
    const control = L.Routing.control({
      waypoints: [
        L.latLng(data.latitude, data.longitude),
        L.latLng(stopPoint.latitude, stopPoint.longitude),
      ],
      lineOptions: {
        styles: [{ color: "blue", weight: 2 }],
      },
      routeWhileDragging: false,
      createMarker: () => null,
    }).addTo(map);

    setRoutingControl(control);
  }
});

// Écoute des mises à jour du bus
socket.on("busLocationUpdate", (data) => {
  console.log("🚍 Bus Location Updated:", data);

  if (!busMarker) {
    const marker = L.marker([data.latitude, data.longitude], { icon: busIcon, draggable: false }).addTo(map);
    setBusMarker(marker);
  } else {
    busMarker.setLatLng([data.latitude, data.longitude]);
  }

  map.setView([data.latitude, data.longitude], 13);

  if (stopPoint) {
    const distance = getDistance(data.latitude, data.longitude, stopPoint.latitude, stopPoint.longitude);

    if (distance < 50 && !alertShown) {
      L.popup()
        .setLatLng([stopPoint.latitude, stopPoint.longitude])
        .setContent(`
          <div style="text-align: center;">
            <p>👨🏻‍🎓 Votre enfant est arrivé.</p>
            <button id="closePopupBtn" 
                    style="background-color: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
              Confirmer
            </button>
          </div>
        `)
        .openOn(map);

      setTimeout(() => {
        document.getElementById("closePopupBtn")?.addEventListener("click", () => {
          map.closePopup();
        });
      }, 20);
    }
  }
});

  
    return () => {
      socket.off("busLocationUpdate");
      socket.off("busLocationStart");
      socket.off("busId");
    };
  }, [map, socket, busid, stopPoint,startPoint,busMarker, routingControl, alertShown]);  
  
  

  return null;
};

// Fonction pour calculer la distance entre deux points GPS
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Rayon de la Terre en mètres
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance en mètres
};

export default LeafletRoutingMachine;
