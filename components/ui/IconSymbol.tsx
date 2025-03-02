// This file is a fallback for using MaterialIcons on Android and web.

import { Ionicons } from '@expo/vector-icons';
import * as SFSymbol from 'expo-sf-symbols';
import React from 'react';
import { Platform, OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';

interface IconSymbolProps {
  name: string;
  size: number;
  color: string;
}

// Map SF Symbol names to Ionicons names for cross-platform support
const iconMap: Record<string, string> = {
  'house.fill': 'home',
  'hand.raised.fill': 'hand-left',
  'clock.fill': 'time',
  'person.fill': 'person',
  // Add more mappings as needed
};

export function IconSymbol({ name, size, color }: IconSymbolProps) {
  // Use SF Symbols on iOS and Ionicons on other platforms
  if (Platform.OS === 'ios') {
    return <SFSymbol.SFSymbol name={name} size={size} color={color} />;
  } else {
    // Use the mapped Ionicons name or fall back to a default icon
    const ionIconName = iconMap[name] || 'help-circle';
    return <Ionicons name={`${ionIconName}${name.includes('.fill') ? '' : '-outline'}`} size={size} color={color} />;
  }
}
