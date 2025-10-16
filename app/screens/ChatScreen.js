import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GiftedChat } from 'react-native-gifted-chat';
import { collection, addDoc, orderBy, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebaseConfig';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, name } = route.params; // Get conversationId and partner's name from route

  // Set the header title to the name of the chat partner
  useLayoutEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  // Set up a real-time listener for messages, but only for non-AI chats
  useEffect(() => {
    if (conversationId === 'AI_CHAT') {
      // For AI chat, we start with a welcome message and don't listen to Firestore
      setMessages([
        {
          _id: 1,
          text: 'Hello! I am your AI Assistant. How can I help you today?',
          createdAt: new Date(),
          user: {
            _id: 'AI',
            name: 'AI Assistant',
          },
        },
      ]);
      return;
    }

    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      const fetchedMessages = snapshot.docs.map(doc => {
        const firebaseData = doc.data();
        const data = {
          _id: doc.id,
          text: firebaseData.text,
          createdAt: firebaseData.createdAt ? firebaseData.createdAt.toDate() : new Date(),
          user: firebaseData.user,
        };
        return data;
      });
      setMessages(fetchedMessages);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [conversationId]);

  // Function to handle sending a new message
  const onSend = useCallback(async (messages = []) => {
    const messageToSend = messages[0];
    
    // If it's an AI chat, call the Cloud Function
    if (conversationId === 'AI_CHAT') {
      setMessages(previousMessages => GiftedChat.append(previousMessages, messages));
      setLoading(true);

      const askAI = httpsCallable(functions, 'askAI');
      try {
        const response = await askAI({ prompt: messageToSend.text });
        const aiResponse = {
          _id: new Date().getTime() + 1, // Unique ID
          text: response.data.result,
          createdAt: new Date(),
          user: {
            _id: 'AI',
            name: 'AI Assistant',
          },
        };
        setMessages(previousMessages => GiftedChat.append(previousMessages, [aiResponse]));
      } catch (error) {
        console.error("Error calling askAI function:", error);
        const errorResponse = {
            _id: new Date().getTime() + 1,
            text: "Sorry, I'm having trouble connecting. Please try again later.",
            createdAt: new Date(),
            user: {
              _id: 'AI',
              name: 'AI Assistant',
            },
          };
        setMessages(previousMessages => GiftedChat.append(previousMessages, [errorResponse]));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Otherwise, use the existing Firestore logic for regular chats
    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');
    addDoc(messagesCollectionRef, {
      text: messageToSend.text,
      createdAt: serverTimestamp(),
      user: {
        _id: auth.currentUser?.uid,
        name: auth.currentUser?.displayName || 'Anonymous',
      },
    }).then(() => {
        const conversationDocRef = doc(db, 'conversations', conversationId);
        updateDoc(conversationDocRef, {
            lastMessage: {
                text: messageToSend.text,
                createdAt: serverTimestamp(),
                senderId: auth.currentUser?.uid,
            }
        });
    }).catch(error => {
        console.error("Error sending message: ", error);
    });
  }, [conversationId]);

  return (
    <GiftedChat
      messages={messages}
      onSend={messages => onSend(messages)}
      user={{
        _id: auth.currentUser?.uid,
      }}
      isLoading={loading}
      messagesContainerStyle={{ backgroundColor: '#fff' }}
    />
  );
};

export default ChatScreen;
