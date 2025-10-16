import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Static AI Chat object
const aiChat = {
  id: 'AI_CHAT', // Special ID for the AI chat
  participants: [], // No real participants
  participantInfo: {
    AI_CHAT: {
      displayName: 'AI Assistant',
      // A placeholder avatar, replace with a real one if available
      photoURL: 'https://firebasestorage.googleapis.com/v0/b/code-60831.appspot.com/o/ai_avatar.png?alt=media&token=a1b2c3d4-e5f6-7890-1234-567890abcdef',
    }
  },
  lastMessage: { text: 'Ask me anything!' },
};

// Component for rendering a single conversation item in the list
const ConversationItem = ({ item }) => {
  const navigation = useNavigation();
  const currentUser = auth.currentUser;

  // Handle the special AI Chat item
  if (item.id === 'AI_CHAT') {
    const name = item.participantInfo.AI_CHAT.displayName;
    const avatar = item.participantInfo.AI_CHAT.photoURL;
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item.id,
          name: name,
          avatar: avatar,
        })}
      >
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <View style={styles.textContainer}>
          <View style={styles.header}>
              <Text style={styles.name}>{name}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage?.text || ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Determine the other participant's ID and information
  const otherParticipantId = item.participants.find(p => p !== currentUser.uid);
  const otherParticipantInfo = item.participantInfo[otherParticipantId];

  // Fallback values for name and avatar if they don't exist
  const name = otherParticipantInfo?.displayName || 'Unknown User';
  const avatar = otherParticipantInfo?.photoURL || 'https://via.placeholder.com/50'; // A placeholder image

  // Function to format Firestore Timestamp to a readable time string
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate('Chat', {
        conversationId: item.id,
        // Pass the other participant's info to the ChatScreen for the header
        name: name,
        avatar: avatar,
      })}
    >
      <Image source={{ uri: avatar }} style={styles.avatar} />
      <View style={styles.textContainer}>
        <View style={styles.header}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.time}>{formatTimestamp(item.lastMessage?.createdAt)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage?.text || 'No messages yet.'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Main screen component
const ConversationListScreen = () => {
  const [conversations, setConversations] = useState([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    // Abort if there's no logged-in user
    if (!currentUser) {
        console.log("No current user found.");
        return;
    };

    // Query to get conversations involving the current user, ordered by the last message time
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessage.createdAt', 'desc')
    );

    // Set up a real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setConversations(convos);
    }, (error) => {
        console.error("Error fetching conversations: ", error);
    });

    // Cleanup the listener on component unmount
    return () => unsubscribe();
  }, [currentUser]); // Rerun effect if the user changes

  return (
    <View style={styles.container}>
      <FlatList
        data={[aiChat, ...conversations]} // Prepend the AI chat to the list of conversations
        renderItem={({ item }) => <ConversationItem item={item} />}
        keyExtractor={item => item.id}
        // When the list is empty, it will still show the AI chat
        ListEmptyComponent={<FlatList data={[aiChat]} renderItem={({ item }) => <ConversationItem item={item} />} keyExtractor={item => item.id} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    itemContainer: {
      flexDirection: 'row',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
      alignItems: 'center',
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 15,
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    name: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    time: {
        fontSize: 12,
        color: '#888',
    },
    lastMessage: {
      color: '#555',
      fontSize: 14,
    },
});

export default ConversationListScreen;
