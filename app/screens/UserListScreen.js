import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

const UserListScreen = () => {
  const [users, setUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const navigation = useNavigation();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUsers = async () => {
      const usersCollectionRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersCollectionRef);
      const userList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== currentUser?.uid);
      setUsers(userList);
      setFilteredUsers(userList);
    };

    fetchUsers();
  }, [currentUser]);

  useEffect(() => {
    if (searchText === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.displayName?.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchText, users]);

  const toggleUserSelection = (user) => {
    setSelectedUsers(prevSelected =>
      prevSelected.find(u => u.id === user.id)
        ? prevSelected.filter(u => u.id !== user.id)
        : [...prevSelected, user]
    );
  };

  const createGroup = async () => {
    if (selectedUsers.length < 2) {
      Alert.alert("Create Group", "Please select at least two users to form a group.");
      return;
    }

    // A cross-platform compatible way to get user input is complex.
    // For now, we will use a fixed name and allow renaming later.
    const groupName = `New Group with ${selectedUsers.length} people`;
    const participants = [currentUser.uid, ...selectedUsers.map(u => u.id)];

    try {
      const conversationRef = await addDoc(collection(db, 'conversations'), {
        participants,
        isGroup: true,
        groupName,
        groupAdmin: currentUser.uid,
        lastMessage: {
          text: `Group '${groupName}' created.`,
          createdAt: serverTimestamp(),
          senderId: null, // System message
        },
      });

      navigation.navigate('Chat', { conversationId: conversationRef.id, name: groupName });
      setSelectedUsers([]); // Reset selection

    } catch (error) {
      console.error("Error creating group: ", error);
      Alert.alert("Error", "Could not create the group. Please try again.");
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    return (
      <TouchableOpacity onPress={() => toggleUserSelection(item)}>
        <View style={[styles.userItem, isSelected && styles.selectedUserItem]}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or email..."
        value={searchText}
        onChangeText={setSearchText}
      />
      {selectedUsers.length > 0 && (
        <TouchableOpacity style={styles.createGroupButton} onPress={createGroup}>
          <Text style={styles.createGroupButtonText}>Create Group ({selectedUsers.length})</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={filteredUsers}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    margin: 10,
  },
  userItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: 'gray',
  },
  selectedUserItem: {
    backgroundColor: '#d3eaff',
  },
  createGroupButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  createGroupButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default UserListScreen;
