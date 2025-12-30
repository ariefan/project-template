import { Button } from "@workspace/ui-mobile/components/button";
import { Icon } from "@workspace/ui-mobile/components/icon";
import { Input } from "@workspace/ui-mobile/components/input";
import { Text } from "@workspace/ui-mobile/components/text";
import { Link, Stack, useRouter } from "expo-router";
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const PasswordIcon = showPassword ? EyeOffIcon : EyeIcon;

  const handleLogin = () => {
    router.replace("/(dashboard)");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-background"
      >
        {/* Header */}
        <View className="flex-row items-center gap-4 px-6 pt-16">
          <Link asChild href="/">
            <Button className="rounded-full" size="icon" variant="ghost">
              <Icon as={ArrowLeftIcon} className="size-5" />
            </Button>
          </Link>
          <Text className="font-bold text-xl">Sign In</Text>
        </View>

        {/* Form */}
        <View className="flex-1 justify-center gap-6 px-6">
          <View className="gap-2">
            <Text variant="h3">Welcome back</Text>
            <Text className="text-muted-foreground">
              Enter your credentials to access your account
            </Text>
          </View>

          <View className="gap-4">
            {/* Email Input */}
            <View className="gap-2">
              <Text className="font-medium text-sm">Email</Text>
              <View className="relative">
                <View className="absolute top-0 left-4 z-10 h-full justify-center">
                  <Icon
                    as={MailIcon}
                    className="size-5 text-muted-foreground"
                  />
                </View>
                <Input
                  autoCapitalize="none"
                  className="pl-12"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  value={email}
                />
              </View>
            </View>

            {/* Password Input */}
            <View className="gap-2">
              <Text className="font-medium text-sm">Password</Text>
              <View className="relative">
                <View className="absolute top-0 left-4 z-10 h-full justify-center">
                  <Icon
                    as={LockIcon}
                    className="size-5 text-muted-foreground"
                  />
                </View>
                <Input
                  className="pr-12 pl-12"
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                />
                <Pressable
                  className="absolute top-0 right-4 h-full justify-center"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon
                    as={PasswordIcon}
                    className="size-5 text-muted-foreground"
                  />
                </Pressable>
              </View>
            </View>

            {/* Forgot Password */}
            <Pressable className="self-end">
              <Text className="text-primary text-sm">Forgot password?</Text>
            </Pressable>
          </View>

          {/* Login Button */}
          <Button className="w-full" onPress={handleLogin} size="lg">
            <Text>Sign In</Text>
          </Button>

          {/* Divider */}
          <View className="flex-row items-center gap-4">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-muted-foreground text-sm">
              or continue with
            </Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          {/* Social Buttons */}
          <View className="flex-row gap-3">
            <Button className="flex-1" variant="outline">
              <Text>Google</Text>
            </Button>
            <Button className="flex-1" variant="outline">
              <Text>Apple</Text>
            </Button>
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center gap-1 pb-8">
          <Text className="text-muted-foreground">Don't have an account?</Text>
          <Pressable>
            <Text className="font-semibold text-primary">Sign Up</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
