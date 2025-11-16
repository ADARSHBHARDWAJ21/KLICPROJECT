import { Redirect, Stack } from "expo-router";
import useAuth from "../../hooks/useauth"; // Clerk session hook

const Layout = () => {
  const { user, isLoading } = useAuth(); // add loading check to avoid flicker

  if (isLoading) return null; // prevent flicker during session check

  if (user) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="phone" options={{ headerShown: false }} />
      <Stack.Screen name="otp" options={{ headerShown: false }} />
      <Stack.Screen name="callback" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
