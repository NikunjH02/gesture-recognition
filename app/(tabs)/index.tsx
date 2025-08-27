import React from 'react';
import { View, Text, StyleSheet,  TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Gesture Recognition App</Text>
        
        <View style={styles.infoContainer}>
          <Text style={styles.description}>
            Welcome to the Gesture Recognition App! This application helps you capture
            and analyze hand gestures using advanced machine learning techniques.
          </Text>
          
          <Text style={styles.featuresTitle}>Key Features:</Text>
          <Text style={styles.featureItem}>• Real-time gesture recognition</Text>
          <Text style={styles.featureItem}>• Historical data tracking</Text>
          <Text style={styles.featureItem}>• User profiles and customization</Text>
          <Text style={styles.featureItem}>• Comprehensive gesture analysis</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => router.push('/main')}>
            <Text style={styles.buttonText}>Start Recognition</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button} 
            onPress={() => router.push('/history')}>
            <Text style={styles.buttonText}>View History</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button} 
            onPress={() => router.push('/profile')}>
            <Text style={styles.buttonText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button} 
            onPress={() => router.push('/message')}>
            <Text style={styles.buttonText}>Edit Messages</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#007AFF',
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  featureItem: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    marginLeft: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
