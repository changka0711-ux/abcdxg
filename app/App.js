import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import { auth } from './firebaseConfig'; // Ensure this path is correct

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          // User is signed in, show home screen
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          // No user is signed in, show login screen
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
