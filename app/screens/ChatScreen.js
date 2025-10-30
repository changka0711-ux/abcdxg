import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, addDoc, orderBy, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, functions, storage } from '../firebaseConfig';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import ChatMessageImage from '../components/ChatMessageImage';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, name } = route.params;
  const flatListRef = useRef();

  useLayoutEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  useEffect(() => {
    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      if (snapshot.empty && conversationId === 'AI_CHAT') {
        // If it's the AI chat and there are no messages, set the initial greeting.
        setMessages([
          {
            _id: 1,
            text: 'Hello! I am your AI Assistant. How can I help you today?',
            createdAt: new Date(),
            user: { _id: 'AI' },
          },
        ]);
      } else {
        const fetchedMessages = snapshot.docs.map(doc => ({
          _id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        setMessages(fetchedMessages);
      }
    });

    return () => unsubscribe();
  }, [conversationId]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images', // Corrected: Use string literal instead of deprecated enum
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        await uploadImage(uri);
      }
    } catch (error) {
      console.error("Error picking image: ", error);
      alert('An error occurred while picking the image.');
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
        createdAt: new Date(), // Use client-side date for optimistic update
        user: { _id: auth.currentUser?.uid },
        image: downloadURL,
        text: '',
      };
      
      onSend([message]);

    } catch (error) {
      console.error("Error uploading image: ", error);
    } finally {
      setLoading(false);
    }
  };

  const onSend = async (newMessages = []) => {
    const messageToSend = newMessages[0];
    setInput(''); // Clear input immediately

    // Optimistic UI update
    setMessages(previousMessages => [messageToSend, ...previousMessages]);

    // 1. Add user's message to Firestore for all conversation types
    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');
    const messageWithTimestamp = {
        ...messageToSend,
        // Replace client-side date with server-side timestamp
        createdAt: serverTimestamp(),
    };
    // We don't need to await this for the UI update, but we'll need the docRef for AI chat.
    const docRef = await addDoc(messagesCollectionRef, messageWithTimestamp);

    // 2. Update the lastMessage for the conversation
    const conversationDocRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationDocRef, {
        lastMessage: {
            text: messageToSend.text ? messageToSend.text : '📷 Image',
            createdAt: serverTimestamp(),
            senderId: auth.currentUser?.uid,
        }
    });

    // 3. If it's the AI chat, call the Cloud Function
    if (conversationId === 'AI_CHAT') {
      setLoading(true);

      // Prepare history for the AI function
      const history = [messageToSend, ...messages].map(msg => ({
        text: msg.text,
        image: msg.image || null,
        user: msg.user
      })).slice(0, 10); // Use the most recent messages for context

      const askAI = httpsCallable(functions, 'askAI');
      try {
        // Ensure prompt is never empty, especially for image-only messages
        const prompt = messageToSend.text || ' '; 
        const payload = { history, prompt };
        const response = await askAI(payload);
        const aiResponse = {
          _id: uuidv4(), // Use a client-side ID for the response message
          text: response.data.result,
          createdAt: serverTimestamp(), // Use server timestamp for consistency
          user: { _id: 'AI', name: 'AI Assistant' },
        };
        // Add AI's response to Firestore
        await addDoc(messagesCollectionRef, aiResponse);
      } catch (error) {
        console.error("Error calling askAI function:", error);
        const errorResponse = {
            _id: uuidv4(),
            text: "Sorry, I'm having trouble connecting. Please try again later.",
            createdAt: serverTimestamp(),
            user: { _id: 'AI', name: 'AI Assistant' },
          };
        // Add error message to Firestore so it persists
        await addDoc(messagesCollectionRef, errorResponse);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderItem = ({ item }) => {
    const isMyMessage = item.user._id === auth.currentUser?.uid;

    // Align the message bubble to the right for the current user, and left for others.
    const messageContainerStyle = {
        alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
        marginVertical: 4, // Add some vertical space between messages
    };

    return (
        <View style={messageContainerStyle}>
            {item.image ? (
                // If the message is an image, render the ChatMessageImage component
                <ChatMessageImage uri={item.image} />
            ) : (
                // Otherwise, render a standard text bubble
                <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage]}>
                    <Text style={isMyMessage ? styles.myMessageText : styles.theirMessageText}>{item.text}</Text>
                </View>
            )}
        </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item._id.toString()}
        inverted
        contentContainerStyle={styles.messagesContainer}
      />
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
          <Text style={styles.attachButtonText}>+</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => onSend([{ _id: uuidv4(), text: input, createdAt: new Date(), user: { _id: auth.currentUser?.uid } }])}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContainer: {
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  messageBubble: {
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: 'black',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  attachButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  attachButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ChatScreen;
