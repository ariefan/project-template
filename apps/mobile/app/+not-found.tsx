import { Text } from "@workspace/ui-mobile/components/text";
import { Link, Stack } from "expo-router";
import { View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-background p-5">
        <Text className="text-foreground" variant="h2">
          This screen doesn't exist.
        </Text>

        <Link className="mt-4 py-4" href="/">
          <Text className="text-primary text-sm">Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
