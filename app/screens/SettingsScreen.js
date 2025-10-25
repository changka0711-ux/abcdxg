import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Alert } from 'react-native';

const SettingsScreen = () => {
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // The onAuthStateChanged listener in App.js will handle navigation
    } catch (error) {
      console.error("Logout Error:", error);
      Alert.alert("Logout Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      {user && (
        <Text style={styles.userInfo}>Logged in as: {user.email}</Text>
      )}
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  userInfo: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 30,
  }
});

export default SettingsScreen;
