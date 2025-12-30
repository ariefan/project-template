import { Button } from "@workspace/ui-mobile/components/button";
import { Icon } from "@workspace/ui-mobile/components/icon";
import { Text } from "@workspace/ui-mobile/components/text";
import {
  ChevronRightIcon,
  CreditCardIcon,
  HelpCircleIcon,
  LogOutIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";

export default function ProfileScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      {/* Profile Header */}
      <View className="items-center gap-4 px-6 pt-8">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-primary">
          <Text className="font-bold text-3xl text-primary-foreground">JD</Text>
        </View>
        <View className="items-center gap-1">
          <Text variant="h3">John Doe</Text>
          <Text className="text-muted-foreground">john.doe@example.com</Text>
        </View>
        <Button size="sm" variant="outline">
          <Text>Edit Profile</Text>
        </Button>
      </View>

      {/* Stats */}
      <View className="flex-row justify-around px-6 pt-8">
        <View className="items-center gap-1">
          <Text className="font-bold text-2xl">128</Text>
          <Text className="text-muted-foreground text-sm">Tasks</Text>
        </View>
        <View className="h-12 w-px bg-border" />
        <View className="items-center gap-1">
          <Text className="font-bold text-2xl">12</Text>
          <Text className="text-muted-foreground text-sm">Projects</Text>
        </View>
        <View className="h-12 w-px bg-border" />
        <View className="items-center gap-1">
          <Text className="font-bold text-2xl">4.9</Text>
          <Text className="text-muted-foreground text-sm">Rating</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View className="gap-2 px-6 pt-8 pb-6">
        <Text className="pb-2 font-semibold text-muted-foreground text-sm">
          ACCOUNT
        </Text>
        <MenuItem icon={UserIcon} label="Personal Information" />
        <MenuItem icon={CreditCardIcon} label="Payment Methods" />
        <MenuItem icon={ShieldIcon} label="Security" />

        <Text className="pt-6 pb-2 font-semibold text-muted-foreground text-sm">
          SUPPORT
        </Text>
        <MenuItem icon={HelpCircleIcon} label="Help Center" />

        <View className="pt-6">
          <Pressable className="flex-row items-center gap-4 rounded-lg bg-destructive/10 p-4">
            <Icon as={LogOutIcon} className="size-5 text-destructive" />
            <Text className="flex-1 font-medium text-destructive">Log Out</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon: IconComponent,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Pressable className="flex-row items-center gap-4 rounded-lg bg-muted/30 p-4">
      <Icon as={IconComponent} className="size-5 text-muted-foreground" />
      <Text className="flex-1 font-medium">{label}</Text>
      <Icon as={ChevronRightIcon} className="size-5 text-muted-foreground" />
    </Pressable>
  );
}
