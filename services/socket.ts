import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showNotification } from '@/config/notifications';
import { API_URL } from '@/src/constants/api';

class SocketService {
  socket: Socket;
  private static instance: SocketService;
  private userId: string | null = null;

  constructor() {
    const serverUrl = "http://" + API_URL;
    console.log("Connecting to:", serverUrl);

    this.socket = io(serverUrl, {
     // transports: ['websocket'], // ✅ force WebSocket
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.setupSocketListeners();
  }

  // Set user ID from React component
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  private setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Socket connected');

      if (this.userId) {
        this.socket.emit('authenticate', { user_id: this.userId }); // ✅ emit, not on
        console.log('Authenticated with user ID:', this.userId);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.log("API URL:", API_URL);
      console.log('❌ Socket connection error:', error.message || error);
    });

    this.socket.on('adc_data', async (data) => {
      console.log('📩 Received ADC data:', data);
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

// Function to emit test data
export const testSocket = () => {
  const testData = {
    id: Date.now(),
    values: Array.from({ length: 5 }, () => Number(Math.random().toFixed(2))),
    message: 'Simulated gesture',
    timestamp: new Date().toISOString()
  };
  socketService.socket.emit('trigger_notification', testData);
};
