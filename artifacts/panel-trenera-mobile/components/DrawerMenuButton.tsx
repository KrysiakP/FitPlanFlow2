import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useColors } from "@/hooks/useColors";

interface DrawerMenuButtonProps {
  style?: object;
}

export function DrawerMenuButton({ style }: DrawerMenuButtonProps) {
  const navigation = useNavigation();
  const colors = useColors();

  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
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
