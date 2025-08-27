import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from '@/src/constants/api';
// import { getDeviceId } from '@/utils/deviceId';

type AuthContextData = {
  isAuthenticated: boolean;
  user: any | null;
  token: string | null;
  isLoading: boolean;
  deviceId: string | null;
  signIn: (email: string, password: string, deviceId?: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (name: string, email: string, password: string, deviceId?: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    // Load token and user data from secure storage on app start
    const loadStoredAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        console.log('Stored token:', storedToken);

        if (storedToken) {
          setToken(storedToken);
          setIsAuthenticated(true);
          
          // Fetch user data with the token
          const userData = await SecureStore.getItemAsync('userData');
          if (userData) {
            setUser(JSON.parse(userData));
          } else {
            // If we have a token but no user data, fetch it from API
            await refreshUserData();
          }
        }
      } catch (error) {
        console.error('Error loading authentication state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const signIn = async (
    email: string, 
    password: string,
    userProvidedDeviceId?: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      setIsLoading(true);
      
      // Use user-provided device ID if available, otherwise use the stored one
      const deviceIdentifier = userProvidedDeviceId
      
      // If user provided a device ID, store it
      if (userProvidedDeviceId) {
        setDeviceId(userProvidedDeviceId);
        if (Platform.OS === 'web') {
          localStorage.setItem('gesture_recognition_device_id', userProvidedDeviceId);
        } else {
          await SecureStore.setItemAsync('gesture_recognition_device_id', userProvidedDeviceId);
        }
      }
      
      const response = await fetch(`http://${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          device_id: deviceIdentifier
        }),
      });

      const data = await response.json();
      
      console.log('Login response:', data);

      if (response.ok && data.user_id) {
        // Store token in secure storage
        await SecureStore.setItemAsync('userToken', data.user_id);
        
        // Store user data if available
        if (data) {
          await SecureStore.setItemAsync('userData', JSON.stringify(data));
          setUser(data);
        }
        
        setToken(data.user_id);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { 
          success: false, 
          message: data.message || 'Invalid email or password' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    name: string, 
    email: string, 
    password: string, 
    userProvidedDeviceId?: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      setIsLoading(true);
      
      // Use user-provided device ID if available, otherwise use the auto-generated one
      const deviceIdentifier = userProvidedDeviceId
      console.log('Device ID:', deviceIdentifier);
      
      // If user provided a device ID, store it
      if (userProvidedDeviceId) {
        setDeviceId(userProvidedDeviceId);
        if (Platform.OS === 'web') {
          localStorage.setItem('gesture_recognition_device_id', userProvidedDeviceId);
        } else {
          await SecureStore.setItemAsync('gesture_recognition_device_id', userProvidedDeviceId);
        }
      }
      
      const response = await fetch(`http://${API_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
       
        body: JSON.stringify({ 
          username:name, 
          email, 
          password,
          device_id: deviceIdentifier 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { 
          success: false, 
          message: data.message || 'Registration failed' 
        };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Clear stored authentication data
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
      
      // Reset state
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Signout error:', error);
    }
  };

  const refreshUserData = async (): Promise<void> => {
    if (!token) return;

    try {
      const response = await fetch(`http://${API_URL}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      } else if (response.status === 401) {
        // Token expired or invalid
        await signOut();
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        isAuthenticated,
        user,
        token,
        isLoading,
        deviceId,
        signIn,
        signUp,
        signOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;