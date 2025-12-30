import { Button } from "@workspace/ui-mobile/components/button";
import { Icon } from "@workspace/ui-mobile/components/icon";
import { Text } from "@workspace/ui-mobile/components/text";
import { useRouter } from "expo-router";
import {
  FileTextIcon,
  HelpCircleIcon,
  InfoIcon,
  LogOutIcon,
  MenuIcon,
  ShieldIcon,
  XIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const DRAWER_WIDTH = 288;

const MENU_ITEMS = [
  { icon: HelpCircleIcon, label: "Help & Support", href: null },
  { icon: FileTextIcon, label: "Terms of Service", href: null },
  { icon: ShieldIcon, label: "Privacy Policy", href: null },
  { icon: InfoIcon, label: "About", href: null },
];

export function DrawerMenu() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  const openDrawer = () => {
    setVisible(true);
    translateX.value = withTiming(0, { duration: 200 });
    backdropOpacity.value = withTiming(1, { duration: 200 });
  };

  const closeDrawer = () => {
    translateX.value = withTiming(-DRAWER_WIDTH, { duration: 150 });
    backdropOpacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(setVisible)(false);
    });
  };

  const handleLogout = () => {
    closeDrawer();
    setTimeout(() => router.replace("/"), 200);
  };

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <>
      <Pressable className="ml-4" onPress={openDrawer}>
        <Icon as={MenuIcon} className="size-6" />
      </Pressable>

      <Modal
        onRequestClose={closeDrawer}
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <View className="flex-row" style={StyleSheet.absoluteFill}>
          {/* Backdrop */}
          <Animated.View
            className="bg-black/50"
            style={[StyleSheet.absoluteFill, backdropStyle]}
          >
            <Pressable onPress={closeDrawer} style={StyleSheet.absoluteFill} />
          </Animated.View>

          {/* Drawer Panel */}
          <Animated.View
            className="h-full bg-background pt-14 shadow-2xl"
            style={[{ width: DRAWER_WIDTH }, drawerStyle]}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between border-border border-b px-4 pb-4">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
                  <Text className="font-bold text-lg text-primary-foreground">
                    JD
                  </Text>
                </View>
                <View>
                  <Text className="font-semibold">John Doe</Text>
                  <Text className="text-muted-foreground text-sm">
                    john@example.com
                  </Text>
                </View>
              </View>
              <Button onPress={closeDrawer} size="icon" variant="ghost">
                <Icon as={XIcon} className="size-5" />
              </Button>
            </View>

            {/* Menu Items */}
            <View className="flex-1 px-2 py-4">
              {MENU_ITEMS.map((item) => (
                <Pressable
                  className="flex-row items-center gap-3 rounded-lg px-4 py-3 active:bg-muted"
                  key={item.label}
                  onPress={closeDrawer}
                >
                  <Icon
                    as={item.icon}
                    className="size-5 text-muted-foreground"
                  />
                  <Text className="font-medium">{item.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Logout */}
            <View className="border-border border-t p-4 pb-8">
              <Pressable
                className="flex-row items-center gap-3 rounded-lg bg-destructive/10 px-4 py-3"
                onPress={handleLogout}
              >
                <Icon as={LogOutIcon} className="size-5 text-destructive" />
                <Text className="font-medium text-destructive">Log Out</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
