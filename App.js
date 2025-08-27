// import React, { useEffect } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';
// import * as Notifications from 'expo-notifications';
// import { socketService } from './services/socket';
// import LandingPage from './screens/LandingPage';
// import ProfilePage from './screens/ProfilePage';
// import RootLayout from './app/_layout';

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//   }),
// });

// const Stack = createStackNavigator();

// export default function App() {
//   useEffect(() => {
//     // Initialize socket connection
//     socketService.initializeSocket();

//     // Request notification permissions
//     (async () => {
//       const { status } = await Notifications.requestPermissionsAsync();
//       if (status !== 'granted') {
//         console.log('Notification permissions not granted');
//       }
//     })();
//   }, []);

//   return (
//     <NavigationContainer>
//       <Stack.Navigator initialRouteName="Landing">
//         <Stack.Screen name="Landing" component={LandingPage} />
//         <Stack.Screen name="Profile" component={ProfilePage} />
//         <Stack.Screen name="Root" component={RootLayout} options={{ headerShown: false }} />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }


import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AuthNavigator from './navigation/AuthNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <AuthNavigator />
    </NavigationContainer>
  );
}
