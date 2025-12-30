import "@/global.css";

import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { NAV_THEME } from "@workspace/ui-mobile/lib/theme";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { LogBox } from "react-native";

// Ignore deprecation warning from dependencies using old SafeAreaView
LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? "light"]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
        <Stack.Screen
          name="notifications"
          options={{
            title: "Notifications",
            headerTitleAlign: "center",
            presentation: "card",
          }}
        />
      </Stack>
      <PortalHost />
    </ThemeProvider>
  );
}
