import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Table, TableWrapper, Cell } from 'react-native-table-component'; 
import { Picker } from "@react-native-picker/picker";
import { API_BASE_URL } from "../config";
import { platformShadow, platformTextShadow } from "../styles/platformStyles";

type RootStackParamList = {
  Login: any;
  Tracking: { selectedBus: string };
  List    : any;
    TrackingScreenBus:any;
}

type ListScreenProps = NativeStackScreenProps<RootStackParamList, "List">;

export default function Track({  route,navigation }: ListScreenProps) {
  interface User {
    ID: string;
    NOM: string;
    NIVEAU: string;
    PRESENCE: boolean;
  }

  const [selectedBus, setSelectedBus] = useState<string>("0"); 
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Helper function to extract number from niveau (e.g., "1ere anne" -> "1", "2eme" -> "2")
  const getNiveauNumber = (niveau: string): string => {
    if (!niveau || niveau === 'N/A') return 'N/A';
    // Extract first number from the string
    const match = niveau.match(/\d+/);
    return match ? match[0] : niveau;
  };

  // Fetch users when bus selection changes - filtering happens in backend
  useEffect(() => {
    setLoading(true);
    // Backend handles filtering: if bus is selected, send bus number to backend
    const API_URL = selectedBus && selectedBus !== "0" 
      ? `${API_BASE_URL}/users?bus=${selectedBus}`
      : `${API_BASE_URL}/users`;
    
    console.log('═══════════════════════════════════════');
    console.log('🔍 [ListStudent] FETCH STARTING');
    console.log('   API_URL:', API_URL);
    console.log('   API_BASE_URL:', API_BASE_URL);
    console.log('   Selected Bus:', selectedBus);
    console.log('   Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════');
    
    fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        console.log('✅ [ListStudent] Response received:', res.status, res.statusText);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('📦 [ListStudent] Data received:', Array.isArray(data) ? `${data.length} items` : typeof data);
        // Transform API data to match mobile app interface
        const transformedUsers: User[] = (data || []).map((user: any) => ({
          ID: String(user.ID),
          NOM: user.NOM || 'Unknown',
          NIVEAU: user.NIVEAU || 'N/A',
          PRESENCE: Boolean(user.presence === 1 || user.presence === true || user.PRESENCE === true),
        }));
        setUsers(transformedUsers);
        setLoading(false);
      })
      .catch(err => {
        console.error("═══════════════════════════════════════");
        console.error("❌ [ListStudent] FETCH ERROR");
        console.error("   Error:", err.message);
        console.error("   Error Name:", err.name);
        console.error("   API_URL:", API_URL);
        console.error("   API_BASE_URL:", API_BASE_URL);
        console.error("   Stack:", err.stack);
        console.error("═══════════════════════════════════════");
        Alert.alert(
          "Erreur de connexion",
          `Impossible de récupérer les étudiants.\n\nURL: ${API_URL}\n\nErreur: ${err.message}\n\nType: ${err.name}\n\nVérifiez:\n- Votre connexion internet\n- Que le serveur est accessible\n- Les logs du serveur backend`,
          [{ text: "OK" }]
        );
        setLoading(false);
      });
  }, [selectedBus]); // Re-fetch when bus selection changes

  const handleValider = () => {
    const updatedPresence = users.map(user => ({ id: user.ID, present: user.PRESENCE }));

    fetch(`${API_BASE_URL}/updateAllPresences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPresence),
    })
      .then(res => res.json())
      .then(data => {
        navigation.navigate("Tracking", { selectedBus });
      })
      .catch(err => console.error("Erreur lors de la mise à jour :", err));
  };

  const togglePresence = (index: number) => {
    const updatedUsers = [...users];
    updatedUsers[index].PRESENCE = !updatedUsers[index].PRESENCE;
    setUsers(updatedUsers);
  };

  const renderPresence = (present: boolean, index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.presenceToggle, present ? styles.presenceToggleActive : styles.presenceToggleInactive]}
      onPress={() => togglePresence(index)}
      activeOpacity={0.8}
    >
      <Text style={[styles.presenceToggleText, present && styles.presenceToggleTextActive]}>
        {present ? "✓" : "❌"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>🚍 Bus Tracker</Text>
        <Text style={styles.subtitle}>Gestion des présences</Text>
      </View>
     
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Sélectionner un bus:</Text>
        <Picker 
          selectedValue={selectedBus} 
          onValueChange={(value) => {
            setSelectedBus(value);
            // Backend will filter automatically when we fetch
          }}
          style={styles.picker}
        >
         <Picker.Item label="📋 Tous les bus" value="0" />
         <Picker.Item label="🚌 Bus 1" value="1" />
         <Picker.Item label="🚌 Bus 2" value="2" />
         <Picker.Item label="🚌 Bus 3" value="3" />
         <Picker.Item label="🚌 Bus 4" value="4" />
        </Picker>
      </View>

      {selectedBus !== "0" && (
        <View style={styles.busInfoContainer}>
          <Text style={styles.busInfo}>📌 {users.length} étudiant(s) dans Bus {selectedBus}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {users.length > 0 ? (
            <View style={styles.tableContainer}>
              <Table borderStyle={styles.tableBorder}>
                <TableWrapper style={styles.tableHeaderRow}>
                  <Cell data="Nom" style={styles.tableHeaderCell} textStyle={styles.tableHeaderText} flex={2} />
                  <Cell data="Niveau" style={styles.tableHeaderCell} textStyle={styles.tableHeaderText} flex={1} />
                  <Cell data="Présence" style={styles.tableHeaderCell} textStyle={styles.tableHeaderText} flex={2} />
                </TableWrapper>
                {users.map((student, index) => {
                  return (
                    <TableWrapper key={student.ID} style={index % 2 === 0 ? [styles.tableRow, styles.tableRowEven] : styles.tableRow}>
                      <Cell 
                        data={student.NOM} 
                        textStyle={styles.tableCellText} 
                        flex={2}
                        style={styles.tableCell}
                      />
                      <Cell 
                        data={getNiveauNumber(student.NIVEAU)} 
                        textStyle={styles.tableCellTextCenter} 
                        flex={1}
                        style={styles.tableCell}
                      />
                      <Cell 
                        data={renderPresence(student.PRESENCE, index)} 
                        flex={2}
                        style={styles.tableCell}
                      />
                    </TableWrapper>
                  );
                })}
              </Table>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Aucun étudiant trouvé</Text>
              <Text style={styles.emptySubtext}>Sélectionnez un autre bus</Text>
            </View>
          )}
        </ScrollView>
      )}

      <TouchableOpacity 
        style={[styles.validButton, (users.length === 0 || loading) && styles.validButtonDisabled]} 
        onPress={handleValider}
        disabled={users.length === 0 || loading}
      >
        <Text style={styles.validButtonText}>✔ Valider les présences</Text>
      </TouchableOpacity>
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
  pickerContainer: { 
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 18,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    ...platformShadow("#000", 3, 0.1, 10, 4),
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
    paddingLeft: 4,
    letterSpacing: 0.3,
  },
  picker: {
    height: 52,
  },
  busInfoContainer: {
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: "#0d9488",
    padding: 16,
    borderRadius: 18,
    ...platformShadow("#0d9488", 4, 0.3, 8, 6),
    borderWidth: 2,
    borderColor: "#2dd4bf",
  },
  busInfo: { 
    fontSize: 16, 
    color: "#fff", 
    fontWeight: "700", 
    textAlign: "center",
    letterSpacing: 0.5,
    ...platformTextShadow("rgba(0,0,0,0.1)", 1, 2),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    ...platformShadow("#000", 4, 0.12, 12, 6),
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  tableBorder: { 
    borderWidth: 1, 
    borderColor: "#e5e7eb" 
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#14b8a6",
    height: 60,
    borderBottomWidth: 2,
    borderBottomColor: "#0d9488",
  },
  tableHeaderCell: {
    height: 60,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#0d9488",
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 65,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  tableRowEven: {
    backgroundColor: "#fafbfc",
  },
  tableCell: {
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: "#f3f4f6",
  },
  tableCellText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    textAlign: "left",
  },
  tableCellTextCenter: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    textAlign: "center",
  },
  presenceToggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    borderWidth: 2,
    borderColor: "#fca5a5",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 85,
  },
  presenceToggleActive: {
    backgroundColor: "#d1fae5",
    borderColor: "#6ee7b7",
  },
  presenceToggleInactive: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
  },
  presenceToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
    letterSpacing: 0.3,
  },
  presenceToggleTextActive: {
    color: "#059669",
  },
  validButton: { 
    backgroundColor: "#14b8a6", 
    padding: 18, 
    borderRadius: 18, 
    alignItems: "center", 
    marginHorizontal: 20,
    marginBottom: 25,
    marginTop: 15,
    ...platformShadow("#14b8a6", 6, 0.4, 12, 8),
    borderWidth: 2,
    borderColor: "#2dd4bf",
  },
  validButtonDisabled: {
    backgroundColor: "#d1d5db",
    borderColor: "#9ca3af",
    ...platformShadow("#000", 0, 0, 0, 0),
  },
  validButtonText: { 
    color: "#fff", 
    fontSize: 17, 
    fontWeight: "800",
    letterSpacing: 0.8,
    ...platformTextShadow("rgba(0,0,0,0.1)", 1, 2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 50,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 17,
    color: "#4b5563",
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
  },
});
