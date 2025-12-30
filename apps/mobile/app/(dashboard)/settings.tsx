import { Icon } from "@workspace/ui-mobile/components/icon";
import { Text } from "@workspace/ui-mobile/components/text";
import {
  BellIcon,
  ChevronRightIcon,
  GlobeIcon,
  MoonIcon,
  PaletteIcon,
  SmartphoneIcon,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";

export default function SettingsScreen() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(false);

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-2 px-6 pt-6 pb-6">
        {/* Appearance */}
        <Text className="pb-2 font-semibold text-muted-foreground text-sm">
          APPEARANCE
        </Text>

        <View className="flex-row items-center gap-4 rounded-lg bg-muted/30 p-4">
          <Icon as={MoonIcon} className="size-5 text-muted-foreground" />
          <Text className="flex-1 font-medium">Dark Mode</Text>
          <Switch
            onValueChange={toggleColorScheme}
            trackColor={{ false: "hsl(0 0% 89.8%)", true: "hsl(0 0% 9%)" }}
            value={colorScheme === "dark"}
          />
        </View>

        <SettingsItem icon={PaletteIcon} label="Theme" value="System" />

        {/* Notifications */}
        <Text className="pt-6 pb-2 font-semibold text-muted-foreground text-sm">
          NOTIFICATIONS
        </Text>

        <View className="flex-row items-center gap-4 rounded-lg bg-muted/30 p-4">
          <Icon as={BellIcon} className="size-5 text-muted-foreground" />
          <Text className="flex-1 font-medium">Push Notifications</Text>
          <Switch
            onValueChange={setNotifications}
            trackColor={{ false: "hsl(0 0% 89.8%)", true: "hsl(0 0% 9%)" }}
            value={notifications}
          />
        </View>

        {/* Security */}
        <Text className="pt-6 pb-2 font-semibold text-muted-foreground text-sm">
          SECURITY
        </Text>

        <View className="flex-row items-center gap-4 rounded-lg bg-muted/30 p-4">
          <Icon as={SmartphoneIcon} className="size-5 text-muted-foreground" />
          <Text className="flex-1 font-medium">Biometric Login</Text>
          <Switch
            onValueChange={setBiometrics}
            trackColor={{ false: "hsl(0 0% 89.8%)", true: "hsl(0 0% 9%)" }}
            value={biometrics}
          />
        </View>

        {/* General */}
        <Text className="pt-6 pb-2 font-semibold text-muted-foreground text-sm">
          GENERAL
        </Text>
        <SettingsItem icon={GlobeIcon} label="Language" value="English" />

        {/* App Info */}
        <View className="mt-8 items-center gap-2">
          <Text className="text-muted-foreground text-sm">AppName v1.0.0</Text>
          <Text className="text-muted-foreground text-xs">
            Made with React Native
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function SettingsItem({
  icon: IconComponent,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Pressable className="flex-row items-center gap-4 rounded-lg bg-muted/30 p-4">
      <Icon as={IconComponent} className="size-5 text-muted-foreground" />
      <Text className="flex-1 font-medium">{label}</Text>
      <Text className="text-muted-foreground">{value}</Text>
      <Icon as={ChevronRightIcon} className="size-5 text-muted-foreground" />
    </Pressable>
  );
}
