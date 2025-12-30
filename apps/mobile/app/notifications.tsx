import { Icon } from "@workspace/ui-mobile/components/icon";
import { Text } from "@workspace/ui-mobile/components/text";
import {
  BellIcon,
  CreditCardIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  StarIcon,
  TrendingUpIcon,
} from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";

const NOTIFICATIONS = [
  {
    id: 1,
    icon: MessageCircleIcon,
    title: "New message from Sarah",
    description: "Hey! Are we still meeting tomorrow?",
    time: "2 min ago",
    unread: true,
    color: "bg-blue-500",
  },
  {
    id: 2,
    icon: CreditCardIcon,
    title: "Payment received",
    description: "You received $850.00 from Freelance Project",
    time: "1 hour ago",
    unread: true,
    color: "bg-green-500",
  },
  {
    id: 3,
    icon: TrendingUpIcon,
    title: "Investment update",
    description: "Your portfolio is up 12.5% this month",
    time: "3 hours ago",
    unread: true,
    color: "bg-purple-500",
  },
  {
    id: 4,
    icon: ShieldCheckIcon,
    title: "Security alert",
    description: "New login from iPhone 15 Pro",
    time: "5 hours ago",
    unread: false,
    color: "bg-orange-500",
  },
  {
    id: 5,
    icon: StarIcon,
    title: "New achievement",
    description: "You completed 100 tasks this month!",
    time: "Yesterday",
    unread: false,
    color: "bg-yellow-500",
  },
  {
    id: 6,
    icon: BellIcon,
    title: "Reminder",
    description: "Team meeting starts in 30 minutes",
    time: "Yesterday",
    unread: false,
    color: "bg-gray-500",
  },
];

export default function NotificationsScreen() {
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Header Actions */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-muted-foreground text-sm">
          {unreadCount} unread
        </Text>
        <Pressable>
          <Text className="font-medium text-primary text-sm">
            Mark all as read
          </Text>
        </Pressable>
      </View>

      {/* Notifications List */}
      <View className="gap-2 px-4 pb-6">
        {NOTIFICATIONS.map((notification) => (
          <NotificationItem key={notification.id} {...notification} />
        ))}
      </View>
    </ScrollView>
  );
}

function NotificationItem({
  icon: IconComponent,
  title,
  description,
  time,
  unread,
  color,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  color: string;
}) {
  return (
    <Pressable
      className={
        unread
          ? "flex-row gap-3 rounded-xl bg-primary/5 p-4"
          : "flex-row gap-3 rounded-xl bg-muted/30 p-4"
      }
    >
      {/* Icon */}
      <View
        className={`h-10 w-10 items-center justify-center rounded-full${color}`}
      >
        <Icon as={IconComponent} className="size-5 text-white" />
      </View>

      {/* Content */}
      <View className="flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text
            className={unread ? "flex-1 font-semibold" : "flex-1 font-medium"}
          >
            {title}
          </Text>
          {unread ? (
            <View className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </View>
        <Text className="text-muted-foreground text-sm" numberOfLines={2}>
          {description}
        </Text>
        <Text className="text-muted-foreground text-xs">{time}</Text>
      </View>
    </Pressable>
  );
}
