import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Static AI Chat object for the header
const aiChat = {
  id: 'AI_CHAT',
  participantInfo: {
    AI_CHAT: {
      displayName: 'AI Assistant',
      photoURL: 'https://firebasestorage.googleapis.com/v0/b/code-60831.appspot.com/o/ai_avatar.png?alt=media&token=a1b2c3d4-e5f6-7890-1234-567890abcdef',
    }
  },
  lastMessage: { text: 'Ask me anything!' },
};

// Component for rendering a single conversation item. It receives `navigation` as a prop.
const ConversationItem = ({ item, navigation }) => {
  const currentUser = auth.currentUser;

  // AI Chat Item (can be rendered as a header or a regular item)
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

  // Regular User Conversation Item
  const otherParticipantId = item.participants.find(p => p !== currentUser.uid);
  if (!otherParticipantId) return null; // Should not happen in a valid conversation

  const otherParticipantInfo = item.participantInfo[otherParticipantId];
  const name = otherParticipantInfo?.displayName || 'Unknown User';
  const avatar = otherParticipantInfo?.photoURL || 'https://via.placeholder.com/50';

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
  const navigation = useNavigation();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        setConversations([]);
        return;
    };

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessage.createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setConversations(convos);
    }, (error) => {
        console.error("Error fetching conversations: ", error);
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={({ item }) => <ConversationItem item={item} navigation={navigation} />}
        keyExtractor={item => item.id}
        // Use ListHeaderComponent to always show the AI chat at the top.
        ListHeaderComponent={() => <ConversationItem item={aiChat} navigation={navigation} />}
        // ListEmptyComponent is now simplified and only shows text.
        ListEmptyComponent={
            <Text style={styles.emptyText}>No other conversations yet.</Text>
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
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#888',
    }
});

export default ConversationListScreen;
