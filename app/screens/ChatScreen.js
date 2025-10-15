import React, { useLayoutEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { name } = route.params;

  // Set the header title to the name of the chat partner
  useLayoutEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  return (
    <View style={styles.container}>
      <View style={styles.messagesContainer}>
        {/* Messages will be rendered here */}
        <Text>Chat with {name}</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Type a message..."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
    margin: 10,
  },
});

export default ChatScreen;
