import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import * as Location from "expo-location";
import { io, Socket } from "socket.io-client";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { GOMAPS_API_KEY, SERVER_URL } from "../config";
import { platformShadow, platformTextShadow } from "../styles/platformStyles";
import { confirmLogout } from "../utils/logout";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type RootStackParamList = {
  Login: any;
  Tracking: { selectedBus: string }; 
  List: { selectedBus: string }; 
    TrackingScreenBus:any;
};

type TrackingScreenProps = NativeStackScreenProps<RootStackParamList, "Tracking">;

export default function Track({ route ,navigation }: TrackingScreenProps) {
  const { selectedBus: initialBus } = route.params; 
  const [selectedBus, setSelectedBus] = useState<string>(initialBus); 
  const [location, setLocation] = useState<Coordinate | null>(null);
  const [startPoint, setStartPoint] = useState<Coordinate | null>(null);
  const [stopPoint, setStopPoint] = useState<Coordinate | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState(""); 
  const [currentLocationInput, setCurrentLocationInput] = useState(""); 
  const [suggestions, setSuggestions] = useState<any[]>([]); 
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const newSocket = io(SERVER_URL, { transports: ["websocket"] });
      newSocket.on("connect", () => {
      console.log("✅ Connecté au serveur WebSocket !");
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Erreur de connexion WebSocket :", err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      console.log("🛑 Déconnecté du serveur WebSocket");
    };
  }, []);
console.log("selectedBus :", selectedBus);
  const startSharingLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("❌ Permission de localisation refusée");
      return;
    }
console.log(" 🚌🚌🚙🚙 Commencer le partage")
    let loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
    setStartPoint(loc.coords);
    const newCoords1: Coordinate = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude
    };
    setCurrentLocationInput(`Lat: ${newCoords1.latitude}, Lng: ${newCoords1.longitude}`);
    console.log("📍 Localisation initiale :", newCoords1);
    setIsSharing(true);

    intervalRef.current = setInterval(async () => {
      let newLocation = await Location.getCurrentPositionAsync({});
      const newCoords: Coordinate = {
        latitude: newLocation.coords.latitude,
        longitude: newLocation.coords.longitude,
      };
      setLocation(newCoords);
      if (socket) {
        socket.emit("busLocationUpdate", newCoords);
        console.log("📡 Localisation Bus envoyée :", newCoords);
        socket.emit("busLocationStart", newCoords1);
        console.log("📍 Départ envoyés au serveur." );
        socket.emit("busId", selectedBus);
        console.log("🚌 id bus",selectedBus );  
      }
    }, 10000); 
  };

  const stopSharingLocation = () => {
    setIsSharing(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log(startPoint)
    console.log("🛑 Arrêt du partage de localisation.");
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3 || !GOMAPS_API_KEY) {
      setSuggestions([]); // N'affiche pas de suggestions si la requête est trop courte
      return;
    }

    const url = `https://maps.gomaps.pro/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOMAPS_API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      setSuggestions(data.predictions || []);
    } catch (error) {
      console.error("❌ Erreur de recherche d'adresses :", error);
    }
  };

  const selectAddress = (address: any) => {
    if (!GOMAPS_API_KEY) return;
    const placeId = address.place_id;
    const url = `https://maps.gomaps.pro/maps/api/place/details/json?placeid=${placeId}&key=${GOMAPS_API_KEY}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const location = data.result.geometry.location;
        console.log("✅ Adresse choisie :", location);
        const stopCoord: Coordinate = {
          latitude: location.lat,
          longitude: location.lng,
        };
        setStartPoint(stopCoord);
       setDestinationQuery(address.description);
       console.log("destination est ",location)
        setSuggestions([]);
      })
      .catch((error) => {
        console.error("❌ Erreur lors de la sélection de l'adresse :", error);
      });
  };

  const handleLogout = () => {
    confirmLogout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      socket?.disconnect();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>🚍 Bus Tracker</Text>
        <Text style={styles.subtitle}>Partage de localisation</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutButtonText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Votre position actuelle"
          value={currentLocationInput}
          onChangeText={(text: string) => setCurrentLocationInput(text)}
          editable={false}  
        />
      </View>

      <TouchableOpacity
        style={[styles.shareButton, isSharing && styles.shareButtonActive]}
        onPress={isSharing ? stopSharingLocation : startSharingLocation}
        activeOpacity={0.8}
      >
        <Text style={styles.shareButtonText}>
          {isSharing ? "🛑 Arrêter le partage" : "📡 Commencer le partage"}
        </Text>
      </TouchableOpacity>

      {!isSharing && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Appuyez sur "Commencer le partage" pour démarrer le suivi.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f0fdfa",
  },
  headerContainer: {
    backgroundColor: "#14b8a6",
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...platformShadow("#14b8a6", 6, 0.4, 12, 10),
    marginBottom: 20,
  },
  header: { 
    textAlign: "center", 
    fontSize: 32, 
    fontWeight: "800", 
    color: "#fff", 
    marginBottom: 6,
    letterSpacing: 0.8,
    ...platformTextShadow("rgba(0,0,0,0.1)", 2, 4),
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
    color: "#ccfbf1",
    fontWeight: "500",
    opacity: 0.95,
  },
  logoutButton: {
    alignSelf: "center",
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  inputContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    height: 52,
    borderColor: "#e5e7eb",
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#374151",
    ...platformShadow("#000", 3, 0.1, 10, 4),
  },
  shareButton: {
    backgroundColor: "#14b8a6",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 15,
    ...platformShadow("#14b8a6", 6, 0.4, 12, 8),
    borderWidth: 2,
    borderColor: "#2dd4bf",
  },
  shareButtonActive: {
    backgroundColor: "#ef4444",
    borderColor: "#fca5a5",
    ...platformShadow("#ef4444", 6, 0.4, 12, 8),
  },
  shareButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.8,
    ...platformTextShadow("rgba(0,0,0,0.1)", 1, 2),
  },
  infoContainer: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  infoText: {
    textAlign: "center",
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    lineHeight: 20,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
});
