import { ClerkProvider } from "@clerk/clerk-expo";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { clerkPublishableKey } from "../lib/clerkConfig";



SplashScreen.preventAutoHideAsync();
LogBox.ignoreLogs(["Warning: ..."]);

export default function RootLayout () {
  const [fontsLoaded] = useFonts({
    "Jakarta-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "Jakarta-ExtraBold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "Jakarta-ExtraLight": require("../assets/fonts/PlusJakartaSans-ExtraLight.ttf"),
    "Jakarta-Light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
    "Jakarta-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "Jakarta": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "Jakarta-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "bebasNeue": require("../assets/fonts/BebasNeue-Regular.ttf"),
    "limelight": require("../assets/fonts/Limelight-Regular.ttf"),
    "sharetech": require("../assets/fonts/ShareTech-Regular.ttf"),
    "lexend": require("../assets/fonts/LexendDeca-VariableFont_wght.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="setting" options={{ headerShown: false }} />
        <Stack.Screen name="others" options={{ headerShown: false }} />


        <Stack.Screen name="+not-found" />
      </Stack>
    </ClerkProvider>
  );
};




