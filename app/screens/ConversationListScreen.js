import React from 'react';
import { View, Text, Button, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Dummy data for now
const conversations = [
  { id: '1', name: 'AI Assistant' },
  { id: '2', name: 'John Doe' },
];

const ConversationListScreen = () => {
  const navigation = useNavigation();

  const renderItem = ({ item }) => (
    <Button
      title={`Chat with ${item.name}`}
      onPress={() => navigation.navigate('Chat', { conversationId: item.id, name: item.name })}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
});

export default ConversationListScreen;
