import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { useColors } from "@/hooks/useColors";

interface DrawerMenuButtonProps {
  style?: object;
}

export function DrawerMenuButton({ style }: DrawerMenuButtonProps) {
  const navigation = useNavigation();
  const colors = useColors();

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Otwórz menu"
      onPress={() => navigation.dispatch({ type: "TOGGLE_DRAWER" }) /* what DrawerActions.toggleDrawer() returns */}
      style={({ pressed }) => [
        {
          padding: 6,
          marginRight: 8,
          opacity: pressed ? 0.6 : 1,
          borderRadius: 8,
        },
        style,
      ]}
      testID="button-drawer-menu"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="menu-outline" size={26} color={colors.foreground} />
    </Pressable>
  );
}
