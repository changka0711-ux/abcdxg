import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { updateUserProfile } from '../firebaseUtils'; // We will create this

const SettingsScreen = () => {
  const [displayName, setDisplayName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch user data on mount
  useEffect(() => {
    if (!auth.currentUser) return;
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setDisplayName(userData.displayName || '');
        setNewDisplayName(userData.displayName || '');
      }
    });
    return unsubscribe;
  }, []);

  const handleUpdateProfile = async () => {
    if (newDisplayName.trim().length < 3) {
      Alert.alert("Invalid Name", "Display name must be at least 3 characters long.");
      return;
    }
    setLoading(true);
    try {
      await updateUserProfile(newDisplayName);
      Alert.alert("Success", "Your profile has been updated.");
    } catch (error) {
      Alert.alert("Error", `Could not update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
      Alert.alert("Logout Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Current Display Name: {displayName}</Text>
      <TextInput
        style={styles.input}
        value={newDisplayName}
        onChangeText={setNewDisplayName}
        placeholder="Enter new display name"
      />

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Update Display Name" onPress={handleUpdateProfile} />
      )}

      <View style={styles.logoutButton}>
        <Button title="Logout" onPress={handleLogout} color="#FF3B30" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 40,
    width: '100%',
  },
});

export default SettingsScreen;
