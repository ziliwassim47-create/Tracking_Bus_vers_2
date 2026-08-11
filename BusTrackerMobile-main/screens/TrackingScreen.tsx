import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AssistantStackParamList } from '../App';
import { platformShadow, platformTextShadow } from '../styles/platformStyles';
import { authenticatedRequest } from '../utils/session';
import { confirmLogout } from '../utils/logout';

type Props = NativeStackScreenProps<AssistantStackParamList, 'Tracking'>;

interface Coordinate {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export default function TrackingScreen({ route, navigation }: Readonly<Props>) {
  const { selectedBus, tripId, tripStatus } = route.params;
  const [location, setLocation] = useState<Coordinate | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const sendPosition = async (coords: Location.LocationObjectCoords) => {
    const current = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      heading: coords.heading,
      speed: coords.speed,
    };
    setLocation(current);
    await authenticatedRequest('/gps', {
      method: 'POST',
      body: JSON.stringify({
        trip_id: tripId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_m: coords.accuracy,
        heading: coords.heading,
        speed_kmh: Math.max(0, Number(coords.speed || 0) * 3.6),
      }),
    });
  };

  const startSharing = async () => {
    setBusy(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('La permission de localisation est nécessaire pour suivre le bus.');
      if (tripStatus !== 'IN_PROGRESS') await authenticatedRequest(`/trips/${tripId}/start`, { method: 'POST' });
      const firstPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await sendPosition(firstPosition.coords);
      setIsSharing(true);
      intervalRef.current = setInterval(async () => {
        try {
          const nextPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          await sendPosition(nextPosition.coords);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Envoi de la position impossible');
        }
      }, 10000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Démarrage impossible';
      setError(message);
      Alert.alert('Localisation', message);
    } finally {
      setBusy(false);
    }
  };

  const finishTrip = async () => {
    setBusy(true);
    setError('');
    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      await authenticatedRequest(`/trips/${tripId}/end`, { method: 'POST' });
      setIsSharing(false);
      navigation.reset({ index: 0, routes: [{ name: 'List' }] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Clôture impossible';
      setError(message);
      Alert.alert('Erreur', message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => confirmLogout(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}><View><Text style={styles.kicker}>Espace Assistante</Text><Text style={styles.header}>Trajet démarré</Text></View><TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutButtonText}>Déconnexion</Text></TouchableOpacity></View>
        <Text style={styles.subtitle}>Bus {selectedBus} · partage de localisation en temps réel</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <View style={[styles.liveDot, isSharing && styles.liveDotActive]} />
          <View style={styles.statusBody}><Text style={styles.statusTitle}>{isSharing ? 'Localisation transmise' : 'Localisation en attente'}</Text><Text style={styles.statusText}>{isSharing ? 'Les parents peuvent suivre le bus en direct.' : 'Démarrez la localisation pour rendre le suivi visible.'}</Text></View>
        </View>

        <View style={styles.positionCard}>
          <Text style={styles.positionLabel}>Position actuelle</Text>
          <Text style={styles.positionValue}>{location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Aucune position envoyée'}</Text>
          <Text style={styles.positionHint}>Mise à jour automatique toutes les 10 secondes</Text>
        </View>

        {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

        {!isSharing ? <TouchableOpacity style={[styles.primaryButton, busy && styles.disabled]} disabled={busy} onPress={startSharing}><Text style={styles.primaryButtonText}>{busy ? 'Démarrage…' : '📡 Démarrer la localisation'}</Text></TouchableOpacity>
          : <TouchableOpacity style={[styles.finishButton, busy && styles.disabled]} disabled={busy} onPress={finishTrip}><Text style={styles.primaryButtonText}>{busy ? 'Clôture…' : '■ Terminer le trajet'}</Text></TouchableOpacity>}

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('List')} disabled={busy}><Text style={styles.backButtonText}>← Retour aux présences</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f0fdfa'},
  headerContainer:{backgroundColor:'#14b8a6',paddingTop:46,paddingBottom:24,paddingHorizontal:20,borderBottomLeftRadius:30,borderBottomRightRadius:30,...platformShadow('#14b8a6',6,.35,14,10)},
  headerTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  kicker:{color:'#ccfbf1',fontSize:12,fontWeight:'700',marginBottom:2},
  header:{color:'#fff',fontSize:26,fontWeight:'900',...platformTextShadow('rgba(0,0,0,.1)',2,3)},
  subtitle:{color:'#e0fdf4',fontSize:13,fontWeight:'600',marginTop:10},
  logoutButton:{minHeight:40,justifyContent:'center',paddingHorizontal:13,borderRadius:999,backgroundColor:'rgba(255,255,255,.18)',borderWidth:1,borderColor:'rgba(255,255,255,.45)'},
  logoutButtonText:{color:'#fff',fontSize:12,fontWeight:'800'},
  content:{padding:18,gap:14},
  statusCard:{padding:16,flexDirection:'row',alignItems:'center',gap:12,borderRadius:18,backgroundColor:'#fff',borderWidth:1.5,borderColor:'#e5e7eb',...platformShadow('#000',3,.08,10,4)},
  liveDot:{width:14,height:14,borderRadius:7,backgroundColor:'#94a3b8'},
  liveDotActive:{backgroundColor:'#22c55e',...platformShadow('#22c55e',0,.45,8,5)},
  statusBody:{flex:1},
  statusTitle:{color:'#1e293b',fontSize:15,fontWeight:'900'},
  statusText:{color:'#64748b',fontSize:12,fontWeight:'500',lineHeight:17,marginTop:3},
  positionCard:{padding:18,borderRadius:18,backgroundColor:'#fff',borderWidth:1.5,borderColor:'#e5e7eb'},
  positionLabel:{color:'#64748b',fontSize:11,fontWeight:'800',textTransform:'uppercase'},
  positionValue:{color:'#0f766e',fontSize:17,fontWeight:'900',marginTop:7},
  positionHint:{color:'#94a3b8',fontSize:11,fontWeight:'600',marginTop:5},
  error:{padding:12,borderRadius:12,backgroundColor:'#fff1f2',color:'#be123c',fontWeight:'600'},
  primaryButton:{minHeight:56,alignItems:'center',justifyContent:'center',padding:15,borderRadius:18,backgroundColor:'#14b8a6',borderWidth:2,borderColor:'#2dd4bf',...platformShadow('#14b8a6',5,.35,11,7)},
  finishButton:{minHeight:56,alignItems:'center',justifyContent:'center',padding:15,borderRadius:18,backgroundColor:'#ef4444',borderWidth:2,borderColor:'#fca5a5',...platformShadow('#ef4444',5,.3,11,7)},
  primaryButtonText:{color:'#fff',fontSize:16,fontWeight:'900'},
  disabled:{opacity:.6},
  backButton:{minHeight:46,alignItems:'center',justifyContent:'center'},
  backButtonText:{color:'#0f766e',fontSize:13,fontWeight:'800'},
});
