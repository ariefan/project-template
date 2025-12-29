import { Card } from "@workspace/ui-mobile/components/card";
import { Text } from "@workspace/ui-mobile/components/text";
import { View } from "react-native";
import { ExternalLink } from "./ExternalLink";
import { MonoText } from "./StyledText";

export default function EditScreenInfo({ path }: { path: string }) {
  return (
    <View className="px-5">
      <View className="mx-12 items-center">
        <Text className="mb-2 text-center text-base text-foreground/80 leading-6">
          Open up the code for this screen:
        </Text>

        <Card className="my-2 bg-muted/50 px-1">
          <MonoText>{path}</MonoText>
        </Card>

        <Text className="text-center text-base text-foreground/80 leading-6">
          Change any of the text, save the file, and your app will automatically
          update.
        </Text>
      </View>

      <View className="mx-5 mt-4 items-center">
        <ExternalLink
          className="py-4"
          href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet"
        >
          <Text className="text-center text-primary">
            Tap here if your app doesn't automatically update after making
            changes
          </Text>
        </ExternalLink>
      </View>
    </View>
  );
}
