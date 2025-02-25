import React from 'react';
import { View, Text, Button } from 'react-native';

export default function LandingPage({ navigation }) {
  return (
    <View>
      <Text>Landing Page</Text>
      <Button
        title="Go to Profile"
        onPress={() => navigation.navigate('Profile')}
      />
    </View>
  );
}
