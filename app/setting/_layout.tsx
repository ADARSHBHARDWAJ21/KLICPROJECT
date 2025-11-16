import { Stack } from "expo-router";
import 'react-native-reanimated';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="prrofile" options={{ headerShown: false }} />
      <Stack.Screen name="business" options={{ headerShown: false }} />
    </Stack>
  );
}