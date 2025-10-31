import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity,  ScrollView } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { socketService, testSocket } from '@/services/socket';
import HandDiagram from '../components/HandDiagram';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/src/constants/api';
import { parse } from '@babel/core';
import BoneFractureDisplay from '../components/BoneFractureDisplay';
import FingerRehabDisplay from '../components/FingerRehabDisplay';
import ParkinsonMonitorDisplay from '../components/ParkinsonMonitorDisplay';
import GeneralGestureDisplay from '../components/GeneralGestureDisplay';

type FeatureType = 'general' | 'bone-fracture' | 'finger-rehab' | 'parkinson';

export default function MainPage() {
  const [currentValues, setCurrentValues] = useState<number[]>([0, 0, 0, 0, 0]);
  const [binaryValues, setBinaryValues] = useState<number[]>([0, 0, 0, 0, 0]);
  const [currentMessage, setCurrentMessage] = useState<string>('No gesture detected');
  const [backendMessage, setBackendMessage] = useState<{ [key: string]: string }>({});
  const [selectedFeature, setSelectedFeature] = useState<FeatureType>('general');
  const { user, token } = useAuth();

  useEffect(() => {
    const setupSocket = async () => {
      try {
        // Set user ID in socket service
        if (user?.user_id) {
          socketService.setUserId(user.user_id);
        }
        
        socketService.connect();
        
        socketService.socket.on('adc_data', (data) => {
            setCurrentValues([...data.values].reverse());
            setCurrentMessage(data.message);
            
            let temp = 0 ; 
            let act_message = parseInt(data.message);
            // act_message==2 ? temp = 2 : act_message== 1 ? temp = 4 :  act_message== 3 ? temp= 1 : act_message== 4 ? temp = 3 : temp =3 ; 

            // act_message = temp ; 
            console.log('Received message:', act_message);

            const x = 3 ;
            // Calculate binary values from message
            const calculatedBinaryValues = [
              (( act_message -1 )>> 0) & 1,
              (( act_message -1 ) >> 1) & 1,
              (( act_message -1 ) >> 2) & 1, 
              (( act_message-1 ) >> 3) & 1,
              (( act_message-1 ) >> 4) & 1
            ];
            
            console.log('Calculated  values:', calculatedBinaryValues);
            setBinaryValues(calculatedBinaryValues);


            
        });
      } catch (error) {
        console.log('Socket setup error:', error);
      }
    };

    setupSocket();
    
    // Only fetch messages if user is available
    if (user?.user_id) {
      fetchMessage();
    }

    return () => {
      socketService.disconnect();
    };
  }, [user?.user_id]);

  const simulateGesture = () => {
    testSocket(); // This will send a test gesture
  };

  const fetchMessage = async () => {
      try {
        if (!user?.user_id) {
          console.log('No user ID available');
          return;
        }
        
        const baseUrl = API_URL ;
        // Ensure the URL has a protocol to make it absolute
        const messageUrl = baseUrl.startsWith('http') ? baseUrl + '/get_messages?user_id=' + user.user_id : 'http://' + baseUrl + '/get_messages?user_id=' + user.user_id;
        console.log('Message URL:', messageUrl);
  
        const response = await fetch(messageUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
  
        const data = await response.json();
        console.log('Message Response:', data);

        console.log('Backend Message:', data.messages);

        setBackendMessage(data.messages);
  
      } catch (error) {
        console.log('Error fetching message:', error);
      }
    };
  

  const handleReset = () => {
    setCurrentValues([0, 0, 0, 0, 0]);
    setBinaryValues([0, 0, 0, 0, 0]);
    setCurrentMessage('No gesture detected');
  };

  const renderFeatureDisplay = () => {
    switch (selectedFeature) {
      case 'bone-fracture':
        return <BoneFractureDisplay values={currentValues} />;
      case 'finger-rehab':
        return <FingerRehabDisplay values={currentValues} />;
      case 'parkinson':
        return <ParkinsonMonitorDisplay values={currentValues} />;
      case 'general':
      default:
        return <GeneralGestureDisplay values={binaryValues} onSimulate={simulateGesture} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.welcomeBanner}>
            <Text style={styles.welcomeTitle}>Welcome to sign Language Detection</Text>
            <Text style={styles.welcomeSubtitle}>Please use our system to learn and practice sign language.</Text>
          </View>

          {/* Feature Selection Menu */}
          <View style={styles.featureSelector}>
            <Text style={styles.featureSelectorTitle}>Select Feature:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featureScroll}>
              <TouchableOpacity 
                style={[styles.featureButton, selectedFeature === 'general' && styles.featureButtonActive]}
                onPress={() => setSelectedFeature('general')}
              >
                <IconSymbol size={20} name="hand.point.up.braille.fill" color={selectedFeature === 'general' ? '#fff' : '#9C27B0'} />
                <Text style={[styles.featureButtonText, selectedFeature === 'general' && styles.featureButtonTextActive]}>
                  General
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.featureButton, selectedFeature === 'bone-fracture' && styles.featureButtonActive]}
                onPress={() => setSelectedFeature('bone-fracture')}
              >
                <IconSymbol size={20} name="bandage.fill" color={selectedFeature === 'bone-fracture' ? '#fff' : '#007AFF'} />
                <Text style={[styles.featureButtonText, selectedFeature === 'bone-fracture' && styles.featureButtonTextActive]}>
                  Bone Fracture
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.featureButton, selectedFeature === 'finger-rehab' && styles.featureButtonActive]}
                onPress={() => setSelectedFeature('finger-rehab')}
              >
                <IconSymbol size={20} name="hand.raised.fill" color={selectedFeature === 'finger-rehab' ? '#fff' : '#4CAF50'} />
                <Text style={[styles.featureButtonText, selectedFeature === 'finger-rehab' && styles.featureButtonTextActive]}>
                  Finger Rehab
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.featureButton, selectedFeature === 'parkinson' && styles.featureButtonActive]}
                onPress={() => setSelectedFeature('parkinson')}
              >
                <IconSymbol size={20} name="waveform.path.ecg" color={selectedFeature === 'parkinson' ? '#fff' : '#FF9800'} />
                <Text style={[styles.featureButtonText, selectedFeature === 'parkinson' && styles.featureButtonTextActive]}>
                  Parkinson's
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
            <Text style={styles.detectedGesture}>{backendMessage[currentMessage] || currentMessage}</Text>
          </View>

          {/* Feature-specific Display */}
          {renderFeatureDisplay()}

          <View style={styles.controls}>
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
  featureSelector: {
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  featureScroll: {
    flexDirection: 'row',
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  featureButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  featureButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  featureButtonTextActive: {
    color: '#fff',
  },
});
