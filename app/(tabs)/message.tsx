import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/src/constants/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import HandDiagram from '../components/HandDiagram';

// Default messages to use if none are returned from the API
const DEFAULT_MESSAGES = {
  "0": "I am hungry",
  "1": "I am thirsty",
  "2": "I need water",
  "3": "I want to eat",
  "4": "I need help",
  "5": "I am tired",
  "6": "I am feeling sick",
  "7": "I am in pain",
  "8": "Call a doctor",
  "9": "I need medicine",
  "10": "Please wait",
  "11": "I am okay",
  "12": "Thank you",
  "13": "Sorry",
  "14": "Yes",
  "15": "No",
  "16": "Where is the bathroom?",
  "17": "I am cold",
  "18": "I am hot",
  "19": "Can you help me?",
  "20": "What is your name?",
  "21": "My name is [Name]",
  "22": "Nice to meet you",
  "23": "I don't understand",
  "24": "Can you repeat that?",
  "25": "I need to go",
  "26": "Please come here",
  "27": "I am lost",
  "28": "Call my family",
  "29": "I can't hear",
  "30": "I use sign language",
  "31": "I need to rest"
};

export default function MessageEditorScreen() {
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchUserMessages();
  }, []);

  const fetchUserMessages = async () => {
    try {
      setIsLoading(true);
      
      console.log('Fetching messages for user:', user?.user_id);
      
      // Try to fetch user-specific messages
      if (user?.user_id) {
        const response = await fetch(`http://${API_URL}/get_messages?user_id=${user.user_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('API Response:', data);
          
          if (data.messages ) {
            setMessages(data.messages);
            console.log('Using custom messages from API');


            console.log('Fetched messages:', messages) ;
            return;
          }
        } else {
          console.log('API response not OK:', response.status);
        }
      }
      
      // If we couldn't get user messages or the response was empty, use defaults
      console.log('Using default messages');
      setMessages(DEFAULT_MESSAGES);
      
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Fallback to defaults on error
      setMessages(DEFAULT_MESSAGES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMessage = (id: any, value: string) => {
    setMessages(prevState => ({
      ...prevState,
      [id]: value
    }));
  };

  const saveMessages = async () => {
    if (!user?.user_id) {
      Alert.alert('Error', 'User ID not available. Please log in again.');
      return;
    }
    
    try {
      setIsSaving(true);
      
      console.log('Saving messages for user:', user.user_id);
      console.log('Messages to save:', messages);
      
      const response = await fetch(`http://${API_URL}/update_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.user_id,
          messages: messages
        }),
      });

      const data = await response.json();
      console.log('Save response:', data);

      if (response.ok && data.success) {
        Alert.alert(
          'Success', 
          'Messages updated successfully!',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      } else {
        Alert.alert('Error', data?.message || 'Failed to update messages');
      }
    } catch (error) {
      console.error('Error updating messages:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderMessageItem = ({ item }) => {
    const [id, message] = item;
    
    // Calculate binary values from id to display in HandDiagram
    const numericId = parseInt(id, 10) + 1;  // Add 1 to align with the gesture indexing
    const binaryValues = [
      ((numericId - 1) >> 0) & 1,
      ((numericId - 1) >> 1) & 1,
      ((numericId - 1) >> 2) & 1,
      ((numericId - 1) >> 3) & 1,
      ((numericId - 1) >> 4) & 1
    ];

    console.log('Rendering message item:', id, message, 'Binary:', binaryValues);
    
    return (
      <View style={styles.messageItem}>
        <View style={styles.indexContainer}>
          <HandDiagram values={binaryValues} scale={0.4} />
        </View>
        <TextInput
          style={styles.messageInput}
          value={message}
          onChangeText={(text) => handleUpdateMessage(id, text)}
          multiline
          placeholder="Enter message"
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </SafeAreaView>
    );
  }

  const messageEntries = Object.entries(messages);
  
  if (messageEntries.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>No messages available.</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchUserMessages}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Messages</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Customize the messages for each gesture recognition number. These messages will be spoken when the corresponding gesture is detected.
        </Text>
      </View>

      <FlatList
        data={messageEntries}
        renderItem={renderMessageItem}
        keyExtractor={([id]) => id}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveMessages}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Messages</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // To offset the back button
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    margin: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Extra space at bottom for button
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  indexContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  indexText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});