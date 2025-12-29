import { Separator } from "@workspace/ui-mobile/components/separator";
import { Text } from "@workspace/ui-mobile/components/text";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";
import EditScreenInfo from "@/components/EditScreenInfo";

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-foreground" variant="h2">
        Modal
      </Text>
      <Separator className="my-8 w-[80%]" />
      <EditScreenInfo path="app/modal.tsx" />

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}
