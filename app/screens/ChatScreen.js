import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, Text, TextInput, Button, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, orderBy, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, functions, storage } from '../firebaseConfig';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState(''); // State for the simple text input
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, name } = route.params; // Get conversationId and partner's name from route

  const pickImage = async () => {
    // No permissions needed to launch the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
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
      
      // Create a message object with an image
      const message = {
        _id: new Date().getTime(),
        createdAt: new Date(),
        user: { _id: auth.currentUser?.uid },
        image: downloadURL,
      };
      
      // Send the message
      onSend([message]);

    } catch (error) {
      console.error("Error uploading image: ", error);
      // Optionally, show an alert to the user
    } finally {
      setLoading(false);
    }
  };

  // Set the header title to the name of the chat partner
  useLayoutEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  // Effect for setting the initial AI welcome message, runs only once
  useEffect(() => {
    if (conversationId === 'AI_CHAT') {
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
    }
  }, [conversationId]);

  // Effect for listening to Firestore messages, runs only for non-AI chats
  useEffect(() => {
    if (conversationId === 'AI_CHAT') {
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
      // Manually construct the user message from the text input state
      const userMessage = {
        _id: new Date().getTime(),
        text: text,
        createdAt: new Date(),
        user: { _id: auth.currentUser?.uid },
      };

      // Append the new user message to the chat
      setMessages(previousMessages => [userMessage, ...previousMessages]);
      setLoading(true);
      setText(''); // Clear the input field

      const askAI = httpsCallable(functions, 'askAI');
      try {
        // Use the text from the message we just constructed
        const response = await askAI({ prompt: userMessage.text });
        const aiResponse = {
          _id: new Date().getTime() + 1, // Unique ID
          text: response.data.result,
          createdAt: new Date(),
          user: {
            _id: 'AI',
            name: 'AI Assistant',
          },
        };
        setMessages(previousMessages => [aiResponse, ...previousMessages]);
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
        setMessages(previousMessages => [errorResponse, ...previousMessages]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Otherwise, use the existing Firestore logic for regular chats
    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');
    addDoc(messagesCollectionRef, {
      text: messageToSend.text || '', // Ensure text is not undefined
      image: messageToSend.image || null, // Add image field
      createdAt: serverTimestamp(),
      user: {
        _id: auth.currentUser?.uid,
        name: auth.currentUser?.displayName || 'Anonymous',
      },
    }).then(() => {
        const conversationDocRef = doc(db, 'conversations', conversationId);
        updateDoc(conversationDocRef, {
            lastMessage: {
                text: messageToSend.text ? messageToSend.text : 'Image',
                createdAt: serverTimestamp(),
                senderId: auth.currentUser?.uid,
            }
        });
    }).catch(error => {
        console.error("Error sending message: ", error);
    });
  }, [conversationId, text]); // Add `text` to the dependency array

  if (conversationId === 'AI_CHAT') {
    return (
      <View style={styles.container}>
        <FlatList
          data={messages}
          inverted
          keyExtractor={item => item._id.toString()}
          renderItem={({ item }) => (
            <View style={item.user._id === 'AI' ? styles.aiMessage : styles.userMessage}>
              <Text style={{ color: item.user._id === 'AI' ? '#000' : '#fff' }}>{item.text}</Text>
            </View>
          )}
        />
        {loading && <ActivityIndicator size="large" color="#0000ff" />}
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
            <Text style={{ fontSize: 20 }}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Ask the AI..."
          />
          <Button title="Send" onPress={() => onSend([{ text }])} disabled={!text || loading} />
        </View>
      </View>
    );
  }

  return (
    <GiftedChat
      messages={messages}
      onSend={messages => onSend(messages)}
      user={{
        _id: auth.currentUser?.uid,
      }}
      isLoading={loading}
      messagesContainerStyle={{ backgroundColor: '#fff' }}
      renderActions={() => (
        <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
          <Text style={{ fontSize: 20, color: '#007bff', marginLeft: 10, marginBottom: 10 }}>+</Text>
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
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
    borderRadius: 20,
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    maxWidth: '80%',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f0f0',
    borderRadius: 20,
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    maxWidth: '80%',
  },
});

export default ChatScreen;
