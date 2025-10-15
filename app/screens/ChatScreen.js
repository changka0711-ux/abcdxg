import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GiftedChat } from 'react-native-gifted-chat';
import { collection, addDoc, orderBy, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, name } = route.params; // Get conversationId and partner's name from route

  // Set the header title to the name of the chat partner
  useLayoutEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  // Set up a real-time listener for messages in the conversation
  useEffect(() => {
    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      const fetchedMessages = snapshot.docs.map(doc => {
        const firebaseData = doc.data();

        // The data structure expected by GiftedChat
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
  const onSend = useCallback((messages = []) => {
    const messageToSend = messages[0];
    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');

    // 1. Add the new message to the 'messages' sub-collection
    addDoc(messagesCollectionRef, {
      text: messageToSend.text,
      createdAt: serverTimestamp(), // Use server timestamp for consistency
      user: {
        _id: auth.currentUser?.uid,
        name: auth.currentUser?.displayName || 'Anonymous',
        // avatar: auth.currentUser?.photoURL, // Optional: add if you store user avatars
      },
    }).then(() => {
        // 2. Update the 'lastMessage' field in the parent conversation document
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
      // Optional: render loading spinner while messages are being fetched
      messagesContainerStyle={{ backgroundColor: '#fff' }}
    />
  );
};

export default ChatScreen;
