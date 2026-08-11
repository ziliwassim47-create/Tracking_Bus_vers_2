import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Cell, TableWrapper } from 'react-native-table-component';
import type { AssistantStackParamList } from '../App';
import { platformShadow, platformTextShadow } from '../styles/platformStyles';
import { authenticatedRequest } from '../utils/session';
import { confirmLogout } from '../utils/logout';

type Props = NativeStackScreenProps<AssistantStackParamList, 'List'>;

interface Assignment {
  id: number;
  route_id: number;
  bus_id: number;
  active: number | boolean;
  route_name: string;
  route_code: string;
  registration: string;
  bus_label: string;
}

interface Trip {
  id: number;
  route_id: number;
  bus_id: number;
  status: string;
  direction: string;
  route_name: string;
  scheduled_start_at: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  school_class?: string;
}

interface RouteStudent {
  route_id: number;
  bus_id: number;
  student_id: number;
  active: number | boolean;
}

interface StudentEvent {
  trip_id: number;
  student_id: number;
  event_type: string;
}

interface Bus {
  id: number;
  registration: string;
  label: string;
  status: string;
}

interface Bootstrap {
  buses: Bus[];
  assignments: Assignment[];
  trips: Trip[];
  students: Student[];
  routeStudents: RouteStudent[];
  studentEvents: StudentEvent[];
}

export default function ListStudent({ navigation }: Readonly<Props>) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [selectedBus, setSelectedBus] = useState('1');
  const [presence, setPresence] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authenticatedRequest<Bootstrap>('/bootstrap')
      .then(payload => {
        const activeAssignments = payload.assignments.filter(item => Boolean(item.active));
        setData({ ...payload, assignments: activeAssignments });
        setSelectedBus(activeAssignments[0] ? String(activeAssignments[0].bus_id) : String(payload.buses[0]?.id || ''));
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, []);

  const selectedAssignment = useMemo(() => data?.assignments.find(item => item.bus_id === Number(selectedBus)) || null,
    [data, selectedBus]);

  const selectedTrip = useMemo(() => {
    if (!data || !selectedAssignment) return null;
    const matches = data.trips.filter(item => item.route_id === selectedAssignment.route_id && item.bus_id === selectedAssignment.bus_id);
    return matches.find(item => item.status === 'IN_PROGRESS') || matches.find(item => item.status === 'PLANNED') || null;
  }, [data, selectedAssignment]);

  const assignedStudents = useMemo(() => {
    if (!data || !selectedAssignment) return [];
    const studentIds = new Set(data.routeStudents
      .filter(item => Boolean(item.active) && item.route_id === selectedAssignment.route_id && item.bus_id === selectedAssignment.bus_id)
      .map(item => item.student_id));
    return data.students.filter(student => studentIds.has(student.id));
  }, [data, selectedAssignment]);

  useEffect(() => {
    const nextPresence: Record<number, boolean> = {};
    assignedStudents.forEach(student => {
      const lastEvent = data?.studentEvents.find(item => item.trip_id === selectedTrip?.id && item.student_id === student.id);
      nextPresence[student.id] = lastEvent?.event_type === 'BOARDED';
    });
    setPresence(nextPresence);
  }, [assignedStudents, data?.studentEvents, selectedTrip?.id]);

  const validateAndStart = async () => {
    if (!selectedAssignment) {
      Alert.alert('Bus non affecté', 'Ce bus n’est pas affecté à cette assistante.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const trip = selectedTrip || await authenticatedRequest<Trip>('/assistant/trips/prepare', {
        method: 'POST',
        body: JSON.stringify({ assignment_id: selectedAssignment.id }),
      });
      await Promise.all(assignedStudents.map(student => authenticatedRequest('/student-events', {
        method: 'POST',
        body: JSON.stringify({
          trip_id: trip.id,
          student_id: student.id,
          event_type: presence[student.id] ? 'BOARDED' : 'ABSENT',
        }),
      })));
      if (trip.status !== 'IN_PROGRESS') {
        await authenticatedRequest(`/trips/${trip.id}/start`, { method: 'POST' });
      }
      setData(current => current ? { ...current, trips: [trip, ...current.trips.filter(item => item.id !== trip.id)] } : current);
      navigation.navigate('Tracking', {
        selectedBus: String(selectedAssignment.bus_id),
        tripId: trip.id,
        tripStatus: 'IN_PROGRESS',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enregistrement impossible';
      setError(message);
      Alert.alert('Erreur', message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => confirmLogout(() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#14b8a6" /><Text style={styles.loadingText}>Chargement de votre affectation…</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <View><Text style={styles.kicker}>Espace Assistante</Text><Text style={styles.header}>Pointage</Text></View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutButtonText}>Déconnexion</Text></TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Vérifiez les enfants avant de démarrer le trajet</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

        <View style={styles.assignmentCard}>
          <Text style={styles.label}>Sélectionner un bus</Text>
          <View style={styles.pickerShell}>
            <Picker selectedValue={selectedBus} onValueChange={value => setSelectedBus(String(value))} style={styles.picker}>
              {(data?.buses || []).slice(0, 4).map(bus => <Picker.Item key={bus.id} value={String(bus.id)} label={`🚌 ${bus.label} · ${bus.registration}`} />)}
            </Picker>
          </View>
          {selectedAssignment
            ? <View style={styles.routeInfo}><Text style={styles.routeName}>Bus {selectedBus} · {selectedAssignment.route_name}</Text><Text style={styles.routeMeta}>{selectedAssignment.registration} · {selectedTrip?.status === 'IN_PROGRESS' ? 'Trajet en cours' : selectedTrip ? 'Prêt à démarrer' : 'Nouveau trajet disponible'}</Text></View>
            : <View style={styles.unassignedInfo}><Text style={styles.unassignedText}>Ce bus n’est pas affecté à cette assistante.</Text></View>}
        </View>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionTitle}>Liste des enfants</Text><Text style={styles.sectionSubtitle}>Touchez le statut pour le modifier</Text></View>
          <View style={styles.countBadge}><Text style={styles.countText}>{assignedStudents.length}</Text></View>
        </View>

        {assignedStudents.length ? <View style={styles.tableContainer}>
            <TableWrapper style={styles.tableHeaderRow}>
              <Cell data="Nom et prénom" flex={2.2} style={styles.tableHeaderCell} textStyle={styles.tableHeaderText} />
              <Cell data="Classe" flex={1} style={styles.tableHeaderCell} textStyle={styles.tableHeaderText} />
              <Cell data="Présence" flex={1.25} style={styles.tableHeaderCell} textStyle={styles.tableHeaderText} />
            </TableWrapper>
            {assignedStudents.map((student, index) => {
              const isPresent = Boolean(presence[student.id]);
              const control = <TouchableOpacity
                accessibilityRole="switch"
                accessibilityState={{ checked: isPresent }}
                style={[styles.presenceButton, isPresent && styles.presenceButtonActive]}
                onPress={() => setPresence(current => ({ ...current, [student.id]: !current[student.id] }))}
              ><Text style={[styles.presenceText, isPresent && styles.presenceTextActive]}>{isPresent ? '✓' : '✕'}</Text></TouchableOpacity>;
              return <TableWrapper key={student.id} style={StyleSheet.flatten([styles.tableRow, index % 2 === 0 && styles.tableRowEven])}>
                <Cell data={`${student.first_name} ${student.last_name}`} flex={2.2} style={styles.tableCell} textStyle={styles.tableNameText} />
                <Cell data={student.school_class || '—'} flex={1} style={styles.tableCell} textStyle={styles.tableCellText} />
                <Cell data={control} flex={1.25} style={styles.tableCell} />
              </TableWrapper>;
            })}
        </View> : <View style={styles.emptyCard}><Text style={styles.emptyIcon}>📋</Text><Text style={styles.emptyText}>Aucun enfant affecté au Bus {selectedBus} pour cette assistante.</Text></View>}

        <TouchableOpacity
          style={[styles.startButton, (!assignedStudents.length || !selectedAssignment || saving) && styles.startButtonDisabled]}
          disabled={!assignedStudents.length || !selectedAssignment || saving}
          onPress={validateAndStart}
        ><Text style={styles.startButtonText}>{saving ? 'Enregistrement…' : selectedTrip?.status === 'IN_PROGRESS' ? '✓ Valider et continuer le trajet' : '✓ Valider et démarrer le trajet'}</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f0fdfa'},
  center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#f0fdfa',padding:24},
  loadingText:{marginTop:14,color:'#64748b',fontWeight:'600'},
  headerContainer:{backgroundColor:'#14b8a6',paddingTop:46,paddingBottom:24,paddingHorizontal:20,borderBottomLeftRadius:30,borderBottomRightRadius:30,...platformShadow('#14b8a6',6,.35,14,10)},
  headerTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  kicker:{color:'#ccfbf1',fontSize:12,fontWeight:'700',marginBottom:2},
  header:{color:'#fff',fontSize:27,fontWeight:'900',letterSpacing:.4,...platformTextShadow('rgba(0,0,0,.1)',2,3)},
  subtitle:{color:'#e0fdf4',fontSize:13,fontWeight:'600',marginTop:10},
  logoutButton:{minHeight:40,justifyContent:'center',paddingHorizontal:13,borderRadius:999,backgroundColor:'rgba(255,255,255,.18)',borderWidth:1,borderColor:'rgba(255,255,255,.45)'},
  logoutButtonText:{color:'#fff',fontSize:12,fontWeight:'800'},
  content:{padding:16,paddingBottom:30},
  error:{padding:12,marginBottom:12,borderRadius:12,backgroundColor:'#fff1f2',color:'#be123c',fontWeight:'600'},
  assignmentCard:{padding:16,borderRadius:18,backgroundColor:'#fff',borderWidth:1.5,borderColor:'#e5e7eb',...platformShadow('#000',3,.08,10,4)},
  label:{color:'#374151',fontSize:14,fontWeight:'800',marginBottom:9},
  pickerShell:{overflow:'hidden',borderWidth:1.5,borderColor:'#d1d5db',borderRadius:12,backgroundColor:'#f8fafc'},
  picker:{height:50,width:'100%'},
  routeInfo:{marginTop:12,padding:12,borderRadius:12,backgroundColor:'#ecfdf5'},
  routeName:{color:'#0f766e',fontSize:14,fontWeight:'800'},
  routeMeta:{color:'#64748b',fontSize:11,fontWeight:'600',marginTop:3},
  unassignedInfo:{marginTop:12,padding:12,borderRadius:12,backgroundColor:'#fff7ed'},
  unassignedText:{color:'#c2410c',fontSize:12,fontWeight:'700'},
  sectionHeading:{marginTop:20,marginBottom:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  sectionTitle:{color:'#1e293b',fontSize:17,fontWeight:'900'},
  sectionSubtitle:{color:'#64748b',fontSize:11,fontWeight:'500',marginTop:2},
  countBadge:{minWidth:32,height:32,paddingHorizontal:8,alignItems:'center',justifyContent:'center',borderRadius:16,backgroundColor:'#ccfbf1'},
  countText:{color:'#0f766e',fontWeight:'900'},
  tableContainer:{overflow:'hidden',borderRadius:16,backgroundColor:'#fff',borderWidth:1.5,borderColor:'#e5e7eb',...platformShadow('#000',3,.08,10,4)},
  tableHeaderRow:{minHeight:52,flexDirection:'row',backgroundColor:'#14b8a6'},
  tableHeaderCell:{minHeight:52,paddingHorizontal:7,alignItems:'center',justifyContent:'center',borderRightWidth:1,borderRightColor:'#0d9488'},
  tableHeaderText:{color:'#fff',fontSize:11,fontWeight:'900',textAlign:'center'},
  tableRow:{minHeight:62,flexDirection:'row',backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#e5e7eb'},
  tableRowEven:{backgroundColor:'#f8fafc'},
  tableCell:{minHeight:62,paddingHorizontal:7,alignItems:'center',justifyContent:'center',borderRightWidth:1,borderRightColor:'#eef2f7'},
  tableNameText:{width:'100%',color:'#1e293b',fontSize:12,fontWeight:'800'},
  tableCellText:{color:'#475569',fontSize:11,fontWeight:'700',textAlign:'center'},
  presenceButton:{width:42,minHeight:36,alignItems:'center',justifyContent:'center',borderRadius:11,borderWidth:1.5,borderColor:'#fca5a5',backgroundColor:'#fee2e2'},
  presenceButtonActive:{borderColor:'#6ee7b7',backgroundColor:'#d1fae5'},
  presenceText:{color:'#dc2626',fontSize:11,fontWeight:'900'},
  presenceTextActive:{color:'#059669'},
  emptyCard:{padding:28,alignItems:'center',borderRadius:18,borderWidth:2,borderStyle:'dashed',borderColor:'#d1d5db',backgroundColor:'#fff'},
  emptyIcon:{fontSize:38,marginBottom:8},
  emptyText:{color:'#64748b',fontSize:13,fontWeight:'600',textAlign:'center'},
  startButton:{minHeight:56,marginTop:18,alignItems:'center',justifyContent:'center',paddingHorizontal:16,borderRadius:18,backgroundColor:'#14b8a6',borderWidth:2,borderColor:'#2dd4bf',...platformShadow('#14b8a6',5,.35,11,7)},
  startButtonDisabled:{backgroundColor:'#cbd5e1',borderColor:'#d1d5db',...platformShadow('#000',0,0,0,0)},
  startButtonText:{color:'#fff',fontSize:15,fontWeight:'900',textAlign:'center',letterSpacing:.2},
});
