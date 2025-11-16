import { useOAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function GoogleAuth() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        router.replace("/(tabs)/home");
      } else {
        Alert.alert("Error", "Failed to complete Google sign in");
      }
    } catch (err: any) {
      console.error("OAuth error", err);
      if (err?.errors?.[0]?.message) {
        Alert.alert("Sign in error", err.errors[0].message);
      } else if (err?.status === "user_cancelled") {
        // User cancelled, no need to show error
        return;
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

