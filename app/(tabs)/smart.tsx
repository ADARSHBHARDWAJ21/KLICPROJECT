import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { 
  ActivityIndicator, 
  Dimensions, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';
import useAuth from '../../hooks/useauth';

const { width } = Dimensions.get('window');

type PlannerOption = {
  id: string;
  title: string;
  description: string;
  icon: string;
  screen?: string;
  color: string[];
  action?: () => void;
};

export default function Smart() {
  const { user, isLoading } = useAuth();

  const plannerOptions: PlannerOption[] = [
    {
      id: '1',
      title: 'AI Budget Planner',
      description: 'Plan your perfect wedding budget with AI assistance',
      icon: 'calculator',
      screen: '/(tools)/budget-planner',
      color: ['#C19A6B', '#8B4513'],
    },
    {
      id: '2',
      title: 'AI Vendor Matcher',
      description: 'Find the perfect vendors based on your preferences',
      icon: 'sparkles',
      screen: '/(tabs)/vendors',
      color: ['#A67B5B', '#8B4513'],
    },
    {
      id: '3',
      title: 'AI Timeline Generator',
      description: 'Create a detailed timeline for your special day',
      icon: 'calendar',
      color: ['#8B4513', '#5D2F0A'],
      action: () => {
        // Navigate to timeline planner
        router.push('/(tabs)/check');
      },
    },
    {
      id: '4',
      title: 'AI Checklist Assistant',
      description: 'Get a personalized checklist for your event',
      icon: 'checkmark-done',
      screen: '/(tabs)/check',
      color: ['#C19A6B', '#A67B5B'],
    },
    {
      id: '5',
      title: 'AI Guest List Manager',
      description: 'Organize and manage your guest list intelligently',
      icon: 'people',
      color: ['#8B4513', '#C19A6B'],
      action: () => {
        // Show coming soon message or navigate when implemented
        console.log('Guest List Manager coming soon');
      },
    },
    {
      id: '6',
      title: 'AI Venue Suggestion',
      description: 'Discover venues that match your style and budget',
      icon: 'business',
      screen: '/(tabs)/vendors',
      color: ['#A67B5B', '#8B4513'],
    },
  ];

  const handleOptionPress = (option: PlannerOption) => {
    if (option.action) {
      option.action();
    } else if (option.screen) {
      router.push(option.screen as any);
    } else {
      // Default action if no screen or action specified
      console.log(`${option.title} clicked`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#f9f3ee', '#f5e9dd']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#C19A6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f9f3ee', '#f5e9dd']}
        style={styles.background}
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>✨ AI Planner</Text>
            <Text style={styles.subtitle}>Intelligent planning for your perfect event</Text>
          </View>
        </View>

        {/* Welcome Section */}
        {user && (
          <View style={styles.welcomeCard}>
            <LinearGradient
              colors={['#C19A6B', '#8B4513']}
              style={styles.welcomeGradient}
            >
              <Ionicons name="sparkles" size={32} color="#fff" />
              <Text style={styles.welcomeText}>
                Welcome to AI Planner
              </Text>
              <Text style={styles.welcomeSubtext}>
                Let AI help you plan your dream wedding with ease
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Planner Options Grid */}
        <View style={styles.optionsContainer}>
          <Text style={styles.sectionTitle}>AI Planning Tools</Text>
          <View style={styles.grid}>
            {plannerOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={option.color}
                  style={styles.optionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons name={option.icon as any} size={32} color="#fff" />
                  </View>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <LinearGradient
            colors={['#E8D6C9', '#D4C4B0']}
            style={styles.infoCard}
          >
            <Ionicons name="information-circle" size={24} color="#8B4513" />
            <Text style={styles.infoText}>
              Our AI-powered tools help you plan your wedding efficiently by providing personalized recommendations and automating complex planning tasks.
            </Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
    fontFamily: 'Jakarta-SemiBold',
  },
  subtitle: {
    fontSize: 16,
    color: '#A67B5B',
    textAlign: 'center',
    fontFamily: 'Jakarta',
  },
  welcomeCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeGradient: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
    fontFamily: 'Jakarta-SemiBold',
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    fontFamily: 'Jakarta',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 16,
    fontFamily: 'Jakarta-SemiBold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: (width - 60) / 2,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  optionGradient: {
    padding: 16,
    minHeight: 160,
    justifyContent: 'space-between',
    borderRadius: 16,
  },
  iconContainer: {
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Jakarta-SemiBold',
  },
  optionDescription: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 18,
    fontFamily: 'Jakarta',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#5D2F0A',
    marginLeft: 12,
    lineHeight: 20,
    fontFamily: 'Jakarta',
  },
});
