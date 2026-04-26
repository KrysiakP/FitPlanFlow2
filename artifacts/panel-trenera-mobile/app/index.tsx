import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (user.role === "trainer") return <Redirect href="/(trainer)" />;
  if (user.role === "client") return <Redirect href="/(client)" />;
  if (user.role === "gym_owner") return <Redirect href="/(gym)" />;
  return <Redirect href="/(auth)/login" />;
}
