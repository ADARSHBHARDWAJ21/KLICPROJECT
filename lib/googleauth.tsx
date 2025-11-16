import { useAuth, useOAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function GoogleAuth() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { isSignedIn, isLoaded } = useAuth();
  const [loading, setLoading] = useState(false);

  // Auto-redirect when signed in - redirects to tabs layout immediately
  // This ensures users are always redirected to app/(tabs)/_layout.tsx after sign-in
  useEffect(() => {
    if (isLoaded && isSignedIn && !loading) {
      console.log("User is signed in via Google, redirecting to tabs layout (/(tabs)/home)");
      // Navigate immediately to tabs layout - will render with app/(tabs)/_layout.tsx
      try {
        router.replace("/(tabs)/home");
      } catch (navErr) {
        console.error("Navigation error:", navErr);
        // Fallback: navigate to root which will check auth and redirect to tabs
        router.replace("/");
      }
    }
  }, [isSignedIn, isLoaded, loading]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await startOAuthFlow();

      console.log("OAuth flow result:", result);
      console.log("Session ID from result:", result.createdSessionId);
      console.log("SetActive available:", !!result.setActive);

      // Check if we have a session ID
      if (result.createdSessionId && result.setActive) {
        // Set the session as active
        await result.setActive({ session: result.createdSessionId });
        console.log("Google sign-in successful, session activated");
        console.log("Session ID:", result.createdSessionId);
        
        // Navigate immediately to tabs layout (home tab)
        // This will render using app/(tabs)/_layout.tsx
        console.log("Redirecting to tabs layout (/(tabs)/home)");
        router.replace("/(tabs)/home");
      } else {
        // Session ID not immediately available - redirect immediately
        // The useEffect will catch isSignedIn change and redirect if needed
        console.log("OAuth flow completed - redirecting to tabs layout (/(tabs)/home)...");
        
        // Redirect immediately to tabs layout - this will render with app/(tabs)/_layout.tsx
        router.replace("/(tabs)/home");
      }
    } catch (err: any) {
      console.error("OAuth error", err);
      
      // Handle specific error cases
      if (err?.status === "user_cancelled" || err?.canceled) {
        // User cancelled, no need to show error
        console.log("User cancelled OAuth flow");
        return;
      }
      
      if (err?.errors?.[0]?.message) {
        Alert.alert("Sign in error", err.errors[0].message);
      } else if (err?.message) {
        Alert.alert("Error", err.message);
      } else {
        Alert.alert("Error", "Failed to sign in with Google. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
        disabled={loading}
      >
        <Text style={styles.googleButtonText}>
          {loading ? "Signing in..." : "Sign in with Google"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  googleButton: {
    backgroundColor: "#4285F4",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

