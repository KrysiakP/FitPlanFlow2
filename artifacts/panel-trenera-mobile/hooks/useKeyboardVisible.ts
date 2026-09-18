import { useKeyboardState } from "react-native-keyboard-controller";

// Uses keyboard-controller (already mounted via KeyboardProvider in the root layout):
// RN's own Keyboard events can be missed when that provider is active.
export function useKeyboardVisible(): boolean {
  return useKeyboardState((state) => state.isVisible);
}
