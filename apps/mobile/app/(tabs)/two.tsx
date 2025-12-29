import { Alert } from "@workspace/ui-mobile/components/alert";
import { Button } from "@workspace/ui-mobile/components/button";
import { Card } from "@workspace/ui-mobile/components/card";
import { Checkbox } from "@workspace/ui-mobile/components/checkbox";
import { Input } from "@workspace/ui-mobile/components/input";
import { Label } from "@workspace/ui-mobile/components/label";
import { Separator } from "@workspace/ui-mobile/components/separator";
import { Skeleton } from "@workspace/ui-mobile/components/skeleton";
import { Switch } from "@workspace/ui-mobile/components/switch";
import { Text } from "@workspace/ui-mobile/components/text";
import { useState } from "react";
import { ScrollView, View } from "react-native";

export default function TabTwoScreen() {
  const [checked, setChecked] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 p-6">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-foreground" variant="h1">
            Form Components
          </Text>
          <Text className="text-muted-foreground" variant="p">
            Interactive form controls and feedback components
          </Text>
        </View>

        <Separator />

        {/* Alert Demo */}
        <Alert variant="default">
          <View className="gap-1">
            <Text className="font-semibold">Tip</Text>
            <Text className="text-sm">
              All form components are fully accessible and keyboard navigable
            </Text>
          </View>
        </Alert>

        {/* Form Example */}
        <Card className="p-4">
          <View className="gap-4">
            <Text variant="h3">Sign In Form</Text>

            <View className="gap-2">
              <Label nativeID="email">Email</Label>
              <Input
                aria-labelledby="email"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="email@example.com"
              />
            </View>

            <View className="gap-2">
              <Label nativeID="password">Password</Label>
              <Input
                aria-labelledby="password"
                placeholder="Enter password"
                secureTextEntry
              />
            </View>

            <View className="flex-row items-center gap-2">
              <Checkbox
                aria-label="Remember me"
                checked={checked}
                onCheckedChange={setChecked}
              />
              <Label onPress={() => setChecked(!checked)}>Remember me</Label>
            </View>

            <Button onPress={() => setLoading(!loading)}>
              <Text>{loading ? "Loading..." : "Sign In"}</Text>
            </Button>
          </View>
        </Card>

        {/* Switch Demo */}
        <Card className="p-4">
          <View className="gap-4">
            <Text variant="h3">Settings</Text>

            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-medium">Enable Notifications</Text>
                <Text className="text-muted-foreground" variant="small">
                  Receive push notifications
                </Text>
              </View>
              <Switch
                aria-label="Enable notifications"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </View>
          </View>
        </Card>

        {/* Skeleton Demo */}
        <Card className="p-4">
          <View className="gap-4">
            <Text variant="h3">Loading States</Text>

            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <View className="flex-1 gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </View>
              </View>
              <Skeleton className="h-24 w-full" />
            </View>
          </View>
        </Card>

        <View className="pb-8">
          <Text className="text-center text-muted-foreground" variant="small">
            Explore more components in the documentation
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
