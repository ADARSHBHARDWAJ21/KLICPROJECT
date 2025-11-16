import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

const Index = () => {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    const redirectTimer = setTimeout(() => {
      if (isSignedIn) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/(auth)/welcome");
      }
    }, 500);

    return () => clearTimeout(redirectTimer);
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
};

export default Index;