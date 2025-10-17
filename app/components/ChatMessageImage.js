import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

const ChatMessageImage = ({ uri }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1); // Default aspect ratio

  useEffect(() => {
    if (uri) {
      Image.getSize(uri, (width, height) => {
        setAspectRatio(width / height);
      }, (err) => {
        console.error(`Failed to get image size for URI: ${uri}`, err);
        setError(true); // Set error if we can't get the size
        setLoading(false);
      });
    }
  }, [uri]);

  return (
    <TouchableOpacity
      style={[styles.container, { aspectRatio: error ? 1 : aspectRatio }]}
      activeOpacity={0.8}
      disabled={error}
    >
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}
      {!error && (
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
      )}
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
    // The height is now determined by the width and the dynamic aspect ratio
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
    marginBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
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
    // This view now styles the container itself when there's an error
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#333', // Darker text for better visibility on light background
    fontSize: 12,
  },
});

export default ChatMessageImage;