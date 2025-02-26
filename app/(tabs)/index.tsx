// import React from 'react';
// import { 
//   View, 
//   Text, 
//   StyleSheet, 
//   SafeAreaView, 
//   ScrollView, 
//   TouchableOpacity, 
//   Image,
//   Platform 
// } from 'react-native';
// import { useNavigation, NavigationProp } from '@react-navigation/native';

// type RootStackParamList = {
//   history: undefined;
//   main: undefined;
//   profile: undefined;
// };

// export default function LandingPage() {
//   const navigation = useNavigation<NavigationProp<RootStackParamList>>();

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <ScrollView style={styles.scrollView}>
//         <View style={styles.container}>
//           <Image
//             source={require('@/assets/images/sign-language.png')}
//             style={styles.logo}
//             resizeMode="contain"
//           />
//           <Text style={styles.title}>Welcome to Sign Language Detection</Text>
//           <Text style={styles.description}>
//             Detect and understand sign language gestures in real-time. Our app helps bridge communication gaps through advanced gesture recognition technology.
//           </Text>

//           <View style={styles.featuresContainer}>
//             <Text style={styles.subtitle}>Key Features:</Text>
//             <View style={styles.featureItem}>
//               <Text style={styles.featureTitle}>• Real-time Detection</Text>
//               <Text style={styles.featureDescription}>
//                 Instantly recognize sign language gestures using your device's camera
//               </Text>
//             </View>
//             <View style={styles.featureItem}>
//               <Text style={styles.featureTitle}>• History Tracking</Text>
//               <Text style={styles.featureDescription}>
//                 Keep track of all detected gestures for future reference
//               </Text>
//             </View>
//             <View style={styles.featureItem}>
//               <Text style={styles.featureTitle}>• User Profiles</Text>
//               <Text style={styles.featureDescription}>
//                 Customize your experience and save your preferences
//               </Text>
//             </View>
//           </View>

//           <TouchableOpacity
//             style={styles.startButton}
//             onPress={() => navigation.navigate('main')}
//           >
//             <Text style={styles.startButtonText}>Start Detection</Text>
//           </TouchableOpacity>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   scrollView: {
//     flex: 1,
//   },
//   container: {
//     flex: 1,
//     padding: 20,
//     alignItems: 'center',
//   },
//   logo: {
//     width: 200,
//     height: 200,
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 16,
//     textAlign: 'center',
//     color: '#333',
//   },
//   description: {
//     fontSize: 16,
//     textAlign: 'center',
//     marginBottom: 32,
//     color: '#666',
//     lineHeight: 24,
//   },
//   featuresContainer: {
//     width: '100%',
//     marginBottom: 32,
//   },
//   subtitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     marginBottom: 16,
//     color: '#333',
//   },
//   featureItem: {
//     marginBottom: 16,
//   },
//   featureTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 8,
//     color: '#444',
//   },
//   featureDescription: {
//     fontSize: 16,
//     color: '#666',
//     paddingLeft: 16,
//   },
//   startButton: {
//     backgroundColor: '#007AFF',
//     paddingHorizontal: 32,
//     paddingVertical: 16,
//     borderRadius: 8,
//     marginTop: 16,
//   },
//   startButtonText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '600',
//   },
// });
