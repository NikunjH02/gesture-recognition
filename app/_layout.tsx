import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { socketService } from '@/services/socket';
import { setupNotifications } from '@/config/notifications';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// This function ensures that users are only allowed to access protected routes when authenticated
function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Check if the user is trying to access authenticated routes
    const inAuthGroup = segments[0] === '(tabs)';
    
    // const isAuthenticated = 1 

    if (inAuthGroup && !isAuthenticated) {
      // Redirect to the login page if they're not authenticated
      router.replace('/login');
    } else if (!inAuthGroup && isAuthenticated) {
      // Redirect to the app if they are authenticated but on auth screens
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  return <Slot />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    const setupApp = async () => {
      try {
        const notificationsEnabled = await setupNotifications();
        console.log('Notifications setup:', notificationsEnabled ? 'success' : 'failed');
        
        socketService.initializeSocket();

        if (loaded) {
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.log('Error setting up app:', error);
      }
    };

    setupApp();
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
