import { Button } from "@workspace/ui-mobile/components/button";
import { Icon } from "@workspace/ui-mobile/components/icon";
import { Text } from "@workspace/ui-mobile/components/text";
import {
  ActivityIcon,
  ArrowUpRightIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react-native";
import { ScrollView, View } from "react-native";

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      {/* Welcome Section */}
      <View className="gap-1 px-6 pt-6">
        <Text className="text-muted-foreground">Good morning,</Text>
        <Text variant="h3">John Doe</Text>
      </View>

      {/* Stats Cards */}
      <View className="flex-row gap-4 px-6 pt-6">
        <StatCard
          change="+12.5%"
          icon={WalletIcon}
          positive
          title="Balance"
          value="$12,450"
        />
        <StatCard
          change="+8.2%"
          icon={ActivityIcon}
          positive
          title="Activity"
          value="284"
        />
      </View>

      {/* Quick Actions */}
      <View className="gap-4 px-6 pt-8">
        <Text className="font-semibold">Quick Actions</Text>
        <View className="flex-row gap-3">
          <ActionButton icon={ArrowUpRightIcon} label="Send" />
          <ActionButton icon={WalletIcon} label="Receive" />
          <ActionButton icon={TrendingUpIcon} label="Invest" />
          <ActionButton icon={ActivityIcon} label="History" />
        </View>
      </View>

      {/* Recent Transactions */}
      <View className="gap-4 px-6 pt-8 pb-6">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold">Recent Transactions</Text>
          <Button size="sm" variant="link">
            <Text className="text-sm">See all</Text>
          </Button>
        </View>

        <View className="gap-3">
          <TransactionItem
            amount="-$15.99"
            negative
            subtitle="Entertainment"
            title="Netflix Subscription"
          />
          <TransactionItem
            amount="+$4,500.00"
            negative={false}
            subtitle="Income"
            title="Salary Deposit"
          />
          <TransactionItem
            amount="-$82.50"
            negative
            subtitle="Shopping"
            title="Grocery Store"
          />
          <TransactionItem
            amount="+$850.00"
            negative={false}
            subtitle="Income"
            title="Freelance Payment"
          />
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({
  icon: IconComponent,
  title,
  value,
  change,
  positive,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <View className="flex-1 gap-3 rounded-xl bg-muted/50 p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Icon as={IconComponent} className="size-5 text-primary" />
      </View>
      <View className="gap-1">
        <Text className="text-muted-foreground text-sm">{title}</Text>
        <Text className="font-bold text-xl">{value}</Text>
        <Text
          className={
            positive ? "text-green-600 text-sm" : "text-red-600 text-sm"
          }
        >
          {change}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({
  icon: IconComponent,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <View className="flex-1 items-center gap-2">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
        <Icon as={IconComponent} className="size-6 text-primary-foreground" />
      </View>
      <Text className="text-sm">{label}</Text>
    </View>
  );
}

function TransactionItem({
  title,
  subtitle,
  amount,
  negative,
}: {
  title: string;
  subtitle: string;
  amount: string;
  negative: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-lg bg-muted/30 p-4">
      <View className="gap-1">
        <Text className="font-medium">{title}</Text>
        <Text className="text-muted-foreground text-sm">{subtitle}</Text>
      </View>
      <Text
        className={
          negative
            ? "font-semibold text-red-600"
            : "font-semibold text-green-600"
        }
      >
        {amount}
      </Text>
    </View>
  );
}
