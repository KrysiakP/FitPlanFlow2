import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === "trainer") return <Redirect href="/(trainer)" />;
  if (user.role === "client") return <Redirect href="/(client)" />;
  return <Redirect href="/(auth)/login" />;
}
