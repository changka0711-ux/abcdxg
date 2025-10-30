import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { searchUsers, addFriend, removeFriend, getOrCreateConversation } from '../firebaseUtils';

const FriendsScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState([]);
  const [friendDetails, setFriendDetails] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Listen for changes in the user's friends list
  useEffect(() => {
    if (!auth.currentUser) return;

    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setFriends(userData.friends || []);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch friend details when the friends list changes
  useEffect(() => {
    if (friends.length === 0) {
      setFriendDetails([]);
      return;
    }

    const friendDocs = friends.map(friendId => doc(db, 'users', friendId));
    const unsubscribes = friendDocs.map((friendDocRef, index) => {
      return onSnapshot(friendDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setFriendDetails(prevDetails => {
            const newDetails = [...prevDetails];
            const existingIndex = newDetails.findIndex(f => f.id === docSnap.id);
            const friendData = { id: docSnap.id, ...docSnap.data() };
            if (existingIndex > -1) {
              newDetails[existingIndex] = friendData;
            } else {
              newDetails.push(friendData);
            }
            return newDetails;
          });
        }
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [friends]);

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.trim().length > 2) {
      setLoading(true);
      const results = await searchUsers(text.trim());
      setSearchResults(results);
      setLoading(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddFriend = async (friendId) => {
    setLoading(true);
    await addFriend(friendId);
    setLoading(false);
    Alert.alert("Friend Added!");
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveFriend = async (friendId) => {
    setLoading(true);
    await removeFriend(friendId);
    // Optimistically update the UI by removing the friend from the local state.
    setFriendDetails(prevDetails => prevDetails.filter(friend => friend.id !== friendId));
    setLoading(false);
    Alert.alert("Friend Removed!");
  };

  const handleStartChat = async (friend) => {
    try {
      const conversationId = await getOrCreateConversation(friend.id);
      navigation.navigate('Chat', {
        conversationId: conversationId,
        name: friend.displayName || friend.email,
      });
    } catch (error) {
      Alert.alert("Error", "Could not start conversation.");
    }
  };

  const renderFriend = ({ item }) => (
    <View style={styles.friendItem}>
      <Text style={styles.friendName}>{item.displayName || item.email}</Text>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.chatButton} onPress={() => handleStartChat(item)}>
          <Text style={styles.buttonText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveFriend(item.id)}>
          <Text style={styles.buttonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }) => (
    <View style={styles.friendItem}>
      <Text style={styles.friendName}>{item.displayName || item.email}</Text>
      <TouchableOpacity style={styles.addButton} onPress={() => handleAddFriend(item.id)}>
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateGroup')}>
          <Text style={styles.createGroupButton}>Create Group</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search for users by name..."
        value={searchQuery}
        onChangeText={handleSearch}
        autoCapitalize="none"
      />

      {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} />}

      {!loading && searchQuery.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<Text style={styles.listHeader}>Search Results</Text>}
        />
      ) : !loading && (
        <FlatList
          data={friendDetails}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<Text style={styles.listHeader}>My Friends</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingIndicator: {
    marginTop: 20,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  createGroupButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#666',
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  friendName: {
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
  },
  addButtonText: {
    color: 'white',
  },
  buttonsContainer: {
    flexDirection: 'row',
  },
  chatButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 10,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
  },
});

export default FriendsScreen;
