import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

const ChatMessageImage = ({ uri }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8}>
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}
      <Image
        source={{ uri }}
        style={styles.image}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        resizeMode="cover"
      />
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load image</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 150,
    borderRadius: 15,
    overflow: 'hidden', // Ensures the image respects the border radius
    backgroundColor: '#E5E5E5', // Placeholder background
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  errorText: {
    color: 'white',
    fontSize: 12,
  },
});

export default ChatMessageImage;