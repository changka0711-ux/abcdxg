import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Static AI Chat object. This will be used to ensure the document exists in Firestore.
const aiChatData = {
  id: 'AI_CHAT',
  participants: [], // AI chat doesn't have participants in the same way
  participantInfo: {
    AI_CHAT: {
      displayName: 'AI Assistant',
      photoURL: 'https://firebasestorage.googleapis.com/v0/b/code-60831.appspot.com/o/ai_avatar.png?alt=media&token=a1b2c3d4-e5f6-7890-1234-567890abcdef',
    }
  },
  lastMessage: { text: 'Ask me anything!', createdAt: new Date() },
};

// Component for rendering a single conversation item in the list
// It no longer uses the useNavigation hook; instead, it receives navigation as a prop.
const ConversationItem = ({ item, navigation }) => {
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
  const [aiChat, setAiChat] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setConversations([]);
      setAiChat(null);
      return;
    }

    // --- Logic to ensure AI Chat document exists in Firestore ---
    const aiChatRef = doc(db, 'conversations', 'AI_CHAT');
    // Use setDoc with merge to create the doc if it doesn't exist, or update it without overwriting.
    // This is a "write" operation but it's idempotent and ensures consistency.
    setDoc(aiChatRef, {
        participantInfo: aiChatData.participantInfo,
        lastMessage: aiChatData.lastMessage
    }, { merge: true }).catch(e => console.error("Error ensuring AI chat doc:", e));

    // --- Listener for the AI Chat document ---
    const unsubscribeAiChat = onSnapshot(aiChatRef, (doc) => {
        if (doc.exists()) {
            setAiChat({ id: doc.id, ...doc.data() });
        }
    }, (error) => {
        console.error("Error fetching AI chat: ", error);
    });

    // --- Listener for regular user conversations ---
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessage.createdAt', 'desc')
    );

    const unsubscribeConversations = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setConversations(convos);
    }, (error) => {
      console.error("Error fetching conversations: ", error);
    });

    // Cleanup both listeners on component unmount
    return () => {
      unsubscribeAiChat();
      unsubscribeConversations();
    };
  }, [auth.currentUser?.uid]);

  // Memoize and sort the combined list of conversations to prevent re-renders
  const allConversations = useMemo(() => {
    const combined = aiChat ? [aiChat, ...conversations] : [...conversations];

    return combined.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt?.toDate() || 0;
      const timeB = b.lastMessage?.createdAt?.toDate() || 0;
      return timeB - timeA; // Sort in descending order (most recent first)
    });
  }, [aiChat, conversations]);

  return (
    <View style={styles.container}>
      <FlatList
        data={allConversations}
        renderItem={({ item }) => <ConversationItem item={item} navigation={navigation} />}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View>
            {/* Show a loading or empty state that doesn't include the AI chat */}
            <Text style={{textAlign: 'center', marginTop: 20}}>No conversations yet.</Text>
          </View>
        }
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
