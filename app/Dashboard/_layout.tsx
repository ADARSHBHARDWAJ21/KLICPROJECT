import { Stack } from "expo-router";

export default function Layoutt() {
  return (
    <Stack>
      <Stack.Screen name="BuisnessProfille" options={{ headerShown: false }} />
      <Stack.Screen name="Dashboards" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ headerShown: false }} />
      <Stack.Screen name="document" options={{ headerShown: false }} />
      <Stack.Screen name="membership" options={{ headerShown: false }} />
      <Stack.Screen name="pro" options={{ headerShown: false }} />
    </Stack>
  );
}