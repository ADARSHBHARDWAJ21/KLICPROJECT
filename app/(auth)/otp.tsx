// screens/ConfirmOTP.tsx
// This file is kept for backward compatibility but phone auth is now handled in phone.tsx
// You can redirect to phone.tsx or remove this file if not needed
import { router } from "expo-router";
import React from "react";
import { Button, Text, View } from "react-native";

export default function ConfirmOTP() {
  return (
    <View style={{ padding: 20 }}>
      <Text>OTP verification is now handled in the phone authentication screen.</Text>
      <Button title="Go to Phone Auth" onPress={() => router.replace("./phone")} />
    </View>
  );
}
