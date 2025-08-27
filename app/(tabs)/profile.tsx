import React from 'react';
import { View, Text, StyleSheet,  TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.profileHeader}>
          <Image
            source={require('@/assets/images/avatar-placeholder.png')}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{''}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.stats?.detections || 156}</Text>
            <Text style={styles.statLabel}>Detections</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.stats?.saved || 23}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.stats?.accuracy || '89%'}</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
        
            
     
          
          <TouchableOpacity style={styles.menuItem}>
            <IconSymbol size={24} name="gear" color="#333" />
            <Text style={styles.menuText}>Settings</Text>
            <IconSymbol size={24} name="chevron.right" color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <IconSymbol size={24} name="bell.fill" color="#333" />
            <Text style={styles.menuText}>Notifications</Text>
            <IconSymbol size={24} name="chevron.right" color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <IconSymbol size={24} name="shield.fill" color="#333" />
            <Text style={styles.menuText}>Privacy</Text>
            <IconSymbol size={24} name="chevron.right" color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, styles.logoutButton]}
            onPress={handleLogout}
          >
            <IconSymbol size={24} name="arrow.right.square" color="#FF3B30" />
            <Text style={[styles.menuText, styles.logoutText]}>Log Out</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  menuContainer: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    marginTop: 16,
    backgroundColor: '#FFF2F2',
  },
  logoutText: {
    color: '#FF3B30',
  },
});
