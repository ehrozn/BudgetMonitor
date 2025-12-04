import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useApp } from "../context/AppContext";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoading, settings } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(tabs)";

    if (settings.isFirstLaunch && inAuthGroup) {
      router.replace("/welcome");
    } else if (!settings.isFirstLaunch && !inAuthGroup) {
      const isOnSetupScreen = segments[0] === "welcome" || segments[0] === "create-account";
      if (isOnSetupScreen) {
        router.replace("/(tabs)");
      }
    }
  }, [isLoading, settings.isFirstLaunch, segments, router]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="create-account" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-transaction" options={{ presentation: "modal", headerTitle: "Add Transaction" }} />
      <Stack.Screen name="edit-transaction" options={{ presentation: "modal", headerTitle: "Edit Transaction" }} />
      <Stack.Screen name="account-details" options={{ presentation: "modal", headerTitle: "Account Details" }} />
      <Stack.Screen name="transfer" options={{ presentation: "modal", headerTitle: "Transfer" }} />
      <Stack.Screen name="transfer-automation" options={{ headerTitle: "Smart Transfers" }} />
      <Stack.Screen name="recurring-manager" options={{ headerShown: false }} />
      <Stack.Screen name="income-distribution" options={{ headerShown: false }} />
      <Stack.Screen name="sub-accounts" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <GestureHandlerRootView>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </AppProvider>
    </QueryClientProvider>
  );
}
