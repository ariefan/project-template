import { Icon } from "@workspace/ui-mobile/components/icon";
import { Text } from "@workspace/ui-mobile/components/text";
import { CheckCheckIcon } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";

const CHATS = [
  {
    id: 1,
    name: "Sarah Wilson",
    message: "Hey! Are we still meeting tomorrow?",
    time: "2m ago",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Team Project",
    message: "Mike: I pushed the latest changes",
    time: "15m ago",
    unread: 5,
    online: false,
  },
  {
    id: 3,
    name: "David Chen",
    message: "Thanks for your help!",
    time: "1h ago",
    unread: 0,
    online: true,
  },
  {
    id: 4,
    name: "Emma Thompson",
    message: "The design looks great",
    time: "2h ago",
    unread: 0,
    online: false,
  },
  {
    id: 5,
    name: "Alex Johnson",
    message: "Can you review my PR?",
    time: "3h ago",
    unread: 1,
    online: false,
  },
  {
    id: 6,
    name: "Marketing Team",
    message: "Lisa: Meeting at 3pm",
    time: "5h ago",
    unread: 0,
    online: false,
  },
];

export default function ChatScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-2 px-4 py-4">
        {CHATS.map((chat) => (
          <ChatItem key={chat.id} {...chat} />
        ))}
      </View>
    </ScrollView>
  );
}

function ChatItem({
  name,
  message,
  time,
  unread,
  online,
}: {
  name: string;
  message: string;
  time: string;
  unread: number;
  online: boolean;
}) {
  return (
    <Pressable className="flex-row items-center gap-3 rounded-xl bg-muted/30 p-4">
      {/* Avatar */}
      <View className="relative">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
          <Text className="font-semibold text-primary-foreground">
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </Text>
        </View>
        {online ? (
          <View className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500" />
        ) : null}
      </View>

      {/* Content */}
      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold">{name}</Text>
          <Text className="text-muted-foreground text-xs">{time}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-1">
            {unread === 0 && (
              <Icon as={CheckCheckIcon} className="size-4 text-primary" />
            )}
            <Text
              className={
                unread > 0
                  ? "font-medium text-foreground text-sm"
                  : "text-muted-foreground text-sm"
              }
              numberOfLines={1}
            >
              {message}
            </Text>
          </View>
          {unread > 0 && (
            <View className="ml-2 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5">
              <Text className="font-semibold text-primary-foreground text-xs">
                {unread}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
