import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { socketService, testSocket } from '@/services/socket';
import HandDiagram from './components/HandDiagram';

export default function MainPage() {
  const [currentValues, setCurrentValues] = useState<number[]>([0, 0, 0, 0, 0]);
  const [currentMessage, setCurrentMessage] = useState<string>('No gesture detected');

  useEffect(() => {
    const setupSocket = async () => {
      try {
        socketService.connect();
        
        socketService.socket.on('notification', (data) => {
          setCurrentValues(data.values);
          setCurrentMessage(data.message);
        });
      } catch (error) {
        console.log('Socket setup error:', error);
      }
    };

    setupSocket();

    return () => {
      socketService.disconnect();
    };
  }, []);

  const simulateGesture = () => {
    testSocket(); // This will send a test gesture
  };

  const handleReset = () => {
    setCurrentValues([0, 0, 0, 0, 0]);
    setCurrentMessage('No gesture detected');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.welcomeBanner}>
            <Text style={styles.welcomeTitle}>Welcome to Sign Language Detection</Text>
            <Text style={styles.welcomeSubtitle}>Please use our system to learn and practice sign language.</Text>
          </View>

          <View style={styles.detectionInfo}>
            <Text style={styles.detectionTitle}>Current Values:</Text>
            <View style={styles.valuesContainer}>
              {currentValues.map((value, index) => (
                <View key={index} style={styles.valueItem}>
                  <Text style={styles.valueLabel}>Value {index + 1}</Text>
                  <Text style={styles.valueText}>{value}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.detectionTitle}>Message:</Text>
            <Text style={styles.detectedGesture}>{currentMessage}</Text>
          </View>

          <HandDiagram values={currentValues} />

          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={simulateGesture}
            >
              <IconSymbol size={28} name="camera.fill" color="#fff" />
              <Text style={styles.buttonText}>Simulate Gesture</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.secondaryButton]}
              onPress={handleReset}
            >
              <IconSymbol size={28} name="arrow.clockwise" color="#007AFF" />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Reset</Text>
            </TouchableOpacity>
          </View>
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
    flexGrow: 1,
    padding: 16,
  },
  container: {
    flex: 1,
  },
  welcomeBanner: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  detectionInfo: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 16,
  },
  detectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  detectedGesture: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  valuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  valueItem: {
    width: '18%',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  valueLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  handContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  finger: {
    width: 20,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },
  fingerOpen: {
    backgroundColor: '#00FF00',
  },
  fingerClosed: {
    backgroundColor: '#FF0000',
  },
});
