import { Button } from "@workspace/ui-mobile/components/button";
import { Icon } from "@workspace/ui-mobile/components/icon";
import { Text } from "@workspace/ui-mobile/components/text";
import { Link, Stack } from "expo-router";
import {
  ArrowRightIcon,
  MoonStarIcon,
  SparklesIcon,
  SunIcon,
  ZapIcon,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { View } from "react-native";

export default function LandingScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-16">
          <Text className="font-bold text-xl">AppName</Text>
          <ThemeToggle />
        </View>

        {/* Hero Section */}
        <View className="flex-1 items-center justify-center gap-8 px-6">
          <View className="items-center gap-4">
            <View className="h-20 w-20 items-center justify-center rounded-2xl bg-primary">
              <Icon
                as={SparklesIcon}
                className="size-10 text-primary-foreground"
              />
            </View>
            <Text className="text-center" variant="h1">
              Welcome to AppName
            </Text>
            <Text className="max-w-sm text-center text-lg text-muted-foreground">
              Your all-in-one solution for productivity and success. Get started
              today.
            </Text>
          </View>

          {/* Features */}
          <View className="w-full max-w-sm gap-3">
            <FeatureItem icon={ZapIcon} text="Lightning fast performance" />
            <FeatureItem
              icon={SparklesIcon}
              text="Beautiful, intuitive design"
            />
          </View>
        </View>

        {/* CTA Buttons */}
        <View className="gap-3 px-6 pb-12">
          <Link asChild href="/login">
            <Button className="w-full" size="lg">
              <Text>Get Started</Text>
              <Icon as={ArrowRightIcon} className="size-5" />
            </Button>
          </Link>
          <Link asChild href="/login">
            <Button className="w-full" size="lg" variant="outline">
              <Text>Sign In</Text>
            </Button>
          </Link>
        </View>
      </View>
    </>
  );
}

function FeatureItem({
  icon: IconComponent,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-lg bg-muted/50 p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Icon as={IconComponent} className="size-5 text-primary" />
      </View>
      <Text className="flex-1 font-medium">{text}</Text>
    </View>
  );
}

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const ThemeIcon = colorScheme === "dark" ? MoonStarIcon : SunIcon;

  return (
    <Button
      className="rounded-full"
      onPressIn={toggleColorScheme}
      size="icon"
      variant="ghost"
    >
      <Icon as={ThemeIcon} className="size-5" />
    </Button>
  );
}
