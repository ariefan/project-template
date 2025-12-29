import { Avatar } from "@workspace/ui-mobile/components/avatar";
import { Badge } from "@workspace/ui-mobile/components/badge";
import { Button } from "@workspace/ui-mobile/components/button";
import { Card } from "@workspace/ui-mobile/components/card";
import { Progress } from "@workspace/ui-mobile/components/progress";
import { Separator } from "@workspace/ui-mobile/components/separator";
import { Text } from "@workspace/ui-mobile/components/text";
import { ScrollView, View } from "react-native";

export default function TabOneScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 p-6">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-foreground" variant="h1">
            React Native Reusables
          </Text>
          <Text className="text-muted-foreground" variant="p">
            Beautiful, accessible components built with rn-primitives
          </Text>
        </View>

        <Separator />

        {/* Component Showcase */}
        <Card className="p-4">
          <View className="gap-4">
            <Text variant="h3">Buttons</Text>
            <View className="flex-row flex-wrap gap-2">
              <Button>
                <Text>Default</Text>
              </Button>
              <Button variant="secondary">
                <Text>Secondary</Text>
              </Button>
              <Button variant="destructive">
                <Text>Destructive</Text>
              </Button>
              <Button variant="outline">
                <Text>Outline</Text>
              </Button>
              <Button variant="ghost">
                <Text>Ghost</Text>
              </Button>
            </View>
          </View>
        </Card>

        <Card className="p-4">
          <View className="gap-4">
            <Text variant="h3">Badges</Text>
            <View className="flex-row flex-wrap gap-2">
              <Badge variant="default">
                <Text className="text-primary-foreground text-xs">Default</Text>
              </Badge>
              <Badge variant="secondary">
                <Text className="text-secondary-foreground text-xs">
                  Secondary
                </Text>
              </Badge>
              <Badge variant="destructive">
                <Text className="text-destructive-foreground text-xs">
                  Destructive
                </Text>
              </Badge>
              <Badge variant="outline">
                <Text className="text-xs">Outline</Text>
              </Badge>
            </View>
          </View>
        </Card>

        <Card className="p-4">
          <View className="gap-4">
            <Text variant="h3">Avatar & Progress</Text>
            <View className="flex-row items-center gap-4">
              <Avatar alt="User Avatar" className="h-12 w-12" />
              <View className="flex-1 gap-2">
                <Text variant="small">Loading...</Text>
                <Progress className="h-2" value={65} />
              </View>
            </View>
          </View>
        </Card>

        <Card className="p-4">
          <View className="gap-3">
            <Text variant="h3">Typography</Text>
            <Text variant="h4">Heading 4</Text>
            <Text variant="p">
              This is a paragraph demonstrating the text component with
              different variants and proper styling.
            </Text>
            <Text className="text-muted-foreground" variant="small">
              Small text for captions and footnotes
            </Text>
            <Text variant="muted">Muted text for less important content</Text>
          </View>
        </Card>

        <View className="pb-8">
          <Text className="text-center text-muted-foreground" variant="small">
            32 components available • Built with @workspace/ui-mobile
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
