import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { createGroupConversation } from '../firebaseUtils';

const CreateGroupScreen = () => {
  const navigation = useNavigation();
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's friends
  useEffect(() => {
    if (!auth.currentUser) return;
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const friendIds = docSnap.data().friends || [];
        // Fetch details for each friend
        const friendPromises = friendIds.map(id => getDoc(doc(db, 'users', id)));
        Promise.all(friendPromises).then(friendDocs => {
          const friendDetails = friendDocs.map(fDoc => ({ id: fDoc.id, ...fDoc.data() }));
          setFriends(friendDetails);
        });
      }
    });
    return unsubscribe;
  }, []);

  const toggleFriendSelection = (friendId) => {
    setSelectedFriends(prevSelected => {
      if (prevSelected.includes(friendId)) {
        return prevSelected.filter(id => id !== friendId);
      } else {
        return [...prevSelected, friendId];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (groupName.trim().length < 3) {
      Alert.alert("Invalid Name", "Group name must be at least 3 characters long.");
      return;
    }
    if (selectedFriends.length < 1) {
      Alert.alert("No Members", "You must select at least one friend to create a group.");
      return;
    }

    setLoading(true);
    try {
      const conversationId = await createGroupConversation(groupName, selectedFriends);
      navigation.replace('Chat', {
        conversationId: conversationId,
        name: groupName,
        isGroup: true,
      });
    } catch (error) {
      Alert.alert("Error", `Could not create group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderFriend = ({ item }) => {
    const isSelected = selectedFriends.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.selectedFriend]}
        onPress={() => toggleFriendSelection(item.id)}
      >
        <Text style={styles.friendName}>{item.displayName}</Text>
        <View style={[styles.checkbox, isSelected && styles.checkedCheckbox]} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a New Group</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter group name..."
        value={groupName}
        onChangeText={setGroupName}
      />
      <Text style={styles.listHeader}>Select Friends</Text>
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id}
      />
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateGroup}
        disabled={loading}
      >
        <Text style={styles.createButtonText}>{loading ? 'Creating...' : 'Create Group'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedFriend: {
    backgroundColor: '#e0f7fa',
  },
  friendName: {
    fontSize: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  checkedCheckbox: {
    backgroundColor: '#007AFF',
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateGroupScreen;
