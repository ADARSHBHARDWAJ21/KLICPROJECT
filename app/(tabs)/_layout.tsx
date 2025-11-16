import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#8B4513',
        tabBarInactiveTintColor: '#A67B5B',
      }}
    >
      <Tabs.Screen 
        name="home" 
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? "home" : "home-outline"} 
                size={24} 
                color={color} 
              />
            </View>
          ),
        }} 
      />
      
      <Tabs.Screen 
        name="vendors" 
        options={{
          title: "Vendors",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? "search" : "search-outline"} 
                size={24} 
                color={color} 
              />
            </View>
          ),
        }} 
      />
      
      <Tabs.Screen 
        name="smart" 
        options={{
          title: "AI Planner",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? "sparkles" : "sparkles-outline"} 
                size={24} 
                color={color} 
              />
            </View>
          ),
        }} 
      />
      
      <Tabs.Screen 
        name="check" 
        options={{
          title: "Checklist",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? "checkmark-done" : "checkmark-done-outline"} 
                size={24} 
                color={color} 
              />
            </View>
          ),
        }} 
      />
      
      <Tabs.Screen 
        name="profile" 
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? "person" : "person-outline"} 
                size={24} 
                color={color} 
              />
            </View>
          ),
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8D6C9',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
     marginBottom:2,
  },
  tabBarItem: {
    paddingVertical: 6,
    height: '100%',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'JakartaSans-SemiBold',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});