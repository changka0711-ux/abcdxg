import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, Text, TextInput, Button, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { GiftedChat, Bubble } from 'react-native-gifted-chat';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, orderBy, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, functions, storage } from '../firebaseConfig';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import ChatMessageImage from '../components/ChatMessageImage';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState(''); // State for the simple text input
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, name } = route.params;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8, // Slightly reduce quality for faster uploads
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      await uploadImage(uri);
    }
  };

  const uploadImage = async (uri) => {
    setLoading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `${uuidv4()}.jpg`;
      const storageRef = ref(storage, `images/${filename}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      const message = {
        _id: uuidv4(),
        createdAt: new Date(),
        user: { _id: auth.currentUser?.uid },
        image: downloadURL,
        text: '', // Ensure text is empty for image messages
      };
      
      onSend([message]);

    } catch (error) {
      console.error("Error uploading image: ", error);
    } finally {
      setLoading(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  useEffect(() => {
    if (conversationId === 'AI_CHAT') {
      setMessages([
        {
          _id: uuidv4(),
          text: 'Hello! I am your AI Assistant. You can ask me questions or send me an image. How can I help you today?',
          createdAt: new Date(),
          user: { _id: 'AI', name: 'AI Assistant' },
        },
      ]);
      return;
    }

    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      const fetchedMessages = snapshot.docs.map(doc => {
        const firebaseData = doc.data();
        return {
          _id: doc.id,
          text: firebaseData.text,
          image: firebaseData.image || null, // --- FIX: Read the image field ---
          createdAt: firebaseData.createdAt ? firebaseData.createdAt.toDate() : new Date(),
          user: firebaseData.user,
        };
      });
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [conversationId]);

  const onSend = useCallback(async (newMessages = []) => {
    const messageToSend = newMessages[0];
    
    if (conversationId === 'AI_CHAT') {
      // Add user message to the UI immediately
      setMessages(previousMessages => GiftedChat.append(previousMessages, [messageToSend]));
      setLoading(true);
      setText('');

      // --- FEATURE: Send conversation history to the AI ---
      const history = [messageToSend, ...messages].map(msg => ({
        text: msg.text,
        image: msg.image || null,
        user: msg.user
      })).slice(0, 10); // Send the last 10 messages for context

      const askAI = httpsCallable(functions, 'askAI');
      try {
        const response = await askAI({ history });
        const aiResponse = {
          _id: uuidv4(),
          text: response.data.result,
          createdAt: new Date(),
          user: { _id: 'AI', name: 'AI Assistant' },
        };
        setMessages(previousMessages => GiftedChat.append(previousMessages, [aiResponse]));
      } catch (error) {
        console.error("Error calling askAI function:", error);
        const errorResponse = {
            _id: uuidv4(),
            text: "Sorry, I'm having trouble connecting. Please try again later.",
            createdAt: new Date(),
            user: { _id: 'AI', name: 'AI Assistant' },
          };
        setMessages(previousMessages => GiftedChat.append(previousMessages, [errorResponse]));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Standard chat logic
    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');
    await addDoc(messagesCollectionRef, {
      ...messageToSend,
      createdAt: serverTimestamp(),
    });

    const conversationDocRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationDocRef, {
        lastMessage: {
            text: messageToSend.text ? messageToSend.text : 'Image',
            createdAt: serverTimestamp(),
            senderId: auth.currentUser?.uid,
        }
    });
  }, [conversationId, messages]); // Add messages to dependency array for history

  // --- FEATURE: Custom bubble for rendering images ---
  const renderBubble = (props) => {
    const { currentMessage } = props;
    if (currentMessage.image) {
      return <ChatMessageImage uri={currentMessage.image} />;
    }
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: { backgroundColor: '#007bff' },
          left: { backgroundColor: '#f1f0f0' },
        }}
        textStyle={{
            right: { color: '#fff' },
            left: { color: '#000' },
        }}
      />
    );
  };

  // --- UI for AI Chat using FlatList ---
  if (conversationId === 'AI_CHAT') {
    return (
      <View style={styles.container}>
        <GiftedChat
            messages={messages}
            onSend={onSend}
            user={{ _id: auth.currentUser?.uid }}
            renderBubble={renderBubble}
            isLoading={loading}
            onInputTextChanged={setText}
            text={text}
            renderActions={() => (
                <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
                  <Text style={{ fontSize: 24, color: '#007bff' }}>+</Text>
                </TouchableOpacity>
              )}
        />
      </View>
    );
  }

  // --- UI for regular chat using GiftedChat ---
  return (
    <GiftedChat
      messages={messages}
      onSend={messages => onSend(messages)}
      user={{
        _id: auth.currentUser?.uid,
      }}
      isLoading={loading}
      renderBubble={renderBubble}
      messagesContainerStyle={{ backgroundColor: '#fff' }}
      renderActions={() => (
        <TouchableOpacity onPress={pickImage} style={styles.attachButtonGifted}>
          <Text style={{ fontSize: 24, color: '#007bff', marginLeft: 10, marginBottom: Platform.OS === 'ios' ? 7 : 10 }}>+</Text>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  attachButton: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  attachButtonGifted: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;