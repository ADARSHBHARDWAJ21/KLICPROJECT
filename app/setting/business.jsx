// app/business-setup/index.jsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function BusinessSetup() {
  const router = useRouter();
  const [hasBusinessAccount, setHasBusinessAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    checkBusinessAccountStatus();
  }, []);

  const checkBusinessAccountStatus = async () => {
    try {
      // Check if user is logged in
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login'); // Redirect to login if not authenticated
        return;
      }

      setUserId(user.id);

      // Check if business profile exists
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      setHasBusinessAccount(!!businessData);
    } catch (error) {
      console.error('Error checking business account:', error);
      Alert.alert('Error', 'Failed to check business account status');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = () => {
    router.push('../Dashboard/BuisnessProfille'); // Start onboarding flow
  };

  const handleDashboard = () => {
    router.push('../Dashboard/Dashboards'); // Go to business dashboard
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Wedeption Business</Text>
      
      <View style={styles.features}>
        <Text style={styles.feature}>✓ Expand Your Business Reach</Text>
        <Text style={styles.feature}>✓ Connect with Targeted Customers</Text>
        <Text style={styles.feature}>✓ Become a Member of Wedeption Community</Text>
        <Text style={styles.feature}>✓ Access Business Analytics Tools</Text>
        <Text style={styles.feature}>✓ Get Marketing Support</Text>
        <Text style={styles.feature}>✓ Secure Payment Processing</Text>
      </View>

      {hasBusinessAccount ? (
        <Button 
          title="Go to Business Dashboard" 
          onPress={handleDashboard} 
          color="#6200ee"
        />
      ) : (
        <Button 
          title="Setup Business Account" 
          onPress={handleSetup} 
          color="#6200ee"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333'
  },
  features: {
    marginBottom: 40,
    paddingHorizontal: 10
  },
  feature: {
    fontSize: 18,
    marginVertical: 8,
    color: '#444'
  }
});