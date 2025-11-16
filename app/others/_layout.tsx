import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="search" options={{ headerShown: false }} />
    </Stack>
  );
}