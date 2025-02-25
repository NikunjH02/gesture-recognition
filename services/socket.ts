import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { showNotification } from '@/config/notifications';

class SocketService {
  socket: Socket;
  private static instance: SocketService;

  constructor() {
    // Use 10.0.2.2 for Android emulator to connect to localhost
    const serverUrl = Platform.OS === 'android' 
      ? 'http://192.168.171.169:5000'
      : 'http://127.0.0.1:5000';

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: false
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('connect_error', (error) => {
      console.log('Socket connection error:', error);
    });

    this.socket.on('notification', async (data) => {
      console.log('Received notification:', data);
      await this.saveToHistory(data);
      // Show notification when data is received
      await showNotification(
        'New Gesture Detected',
        `Detected gesture: ${data.message}`
      );
    });
  }

  async saveToHistory(data: any) {
    try {
      const existingHistory = await AsyncStorage.getItem('gestureHistory');
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      const updatedHistory = [data, ...history];
      await AsyncStorage.setItem('gestureHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.log('Error saving to history:', error);
    }
  }

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  initializeSocket() {
    this.connect();
    console.log('Socket initialized');
  }
}

export const socketService = SocketService.getInstance();
export const testSocket = () => {
  const testData = {
    id: Date.now(),
    values: Array.from({ length: 5 }, () => Number(Math.random().toFixed(2))),
    message: 'Test gesture',
    timestamp: new Date().toISOString()
  };
  socketService.socket.emit('trigger_notification', testData);
};
