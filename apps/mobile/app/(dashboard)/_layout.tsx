import { Icon } from "@workspace/ui-mobile/components/icon";
import { Link, Tabs } from "expo-router";
import {
  BellIcon,
  HomeIcon,
  MessageCircleIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Pressable, View } from "react-native";
import { DrawerMenu } from "@/components/drawer-menu";

function NotificationButton() {
  return (
    <Link asChild href="/notifications">
      <Pressable className="mr-4">
        <View className="relative">
          <Icon as={BellIcon} className="size-6" />
          <View className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive" />
        </View>
      </Pressable>
    </Link>
  );
}

export default function DashboardLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: isDark ? "hsl(0 0% 98%)" : "hsl(0 0% 9%)",
        tabBarInactiveTintColor: isDark ? "hsl(0 0% 63.9%)" : "hsl(0 0% 45.1%)",
        tabBarStyle: {
          backgroundColor: isDark ? "hsl(0 0% 3.9%)" : "hsl(0 0% 100%)",
          borderTopColor: isDark ? "hsl(0 0% 14.9%)" : "hsl(0 0% 89.8%)",
        },
        headerStyle: {
          backgroundColor: isDark ? "hsl(0 0% 3.9%)" : "hsl(0 0% 100%)",
        },
        headerTintColor: isDark ? "hsl(0 0% 98%)" : "hsl(0 0% 3.9%)",
        headerLeft: () => <DrawerMenu />,
        headerRight: () => <NotificationButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Icon as={HomeIcon} size={size} style={{ color }} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Icon as={MessageCircleIcon} size={size} style={{ color }} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Icon as={UserIcon} size={size} style={{ color }} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Icon as={SettingsIcon} size={size} style={{ color }} />
          ),
        }}
      />
    </Tabs>
  );
}
