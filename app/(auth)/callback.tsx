import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

const AuthCallback = () => {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
};

export default AuthCallback;