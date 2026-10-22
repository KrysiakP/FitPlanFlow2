import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/useColors";

/** A small cross-platform "type something" dialog (Alert.prompt exists on iOS only). */
export function TextPromptModal({
  visible,
  title,
  hint,
  placeholder,
  submitLabel,
  minLength = 3,
  maxLength = 300,
  busy = false,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  title: string;
  hint?: string;
  placeholder: string;
  submitLabel: string;
  minLength?: number;
  maxLength?: number;
  busy?: boolean;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  const [text, setText] = useState("");
  useEffect(() => {
    if (visible) setText("");
  }, [visible]);
  const ready = text.trim().length >= minLength && !busy;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]} testID="modal-text-prompt">
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {hint ? <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text> : null}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            maxLength={maxLength}
            autoFocus
            multiline
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            testID="input-text-prompt"
          />
          <View style={styles.actions}>
            <Pressable onPress={onCancel} accessibilityRole="button" style={styles.cancel} testID="button-prompt-cancel">
              <Text style={{ color: colors.mutedForeground, fontSize: 15, fontFamily: "Inter_500Medium" }}>Anuluj</Text>
            </Pressable>
            <Pressable
              onPress={() => ready && onSubmit(text.trim())}
              accessibilityRole="button"
              accessibilityState={{ disabled: !ready }}
              style={[styles.submit, { backgroundColor: colors.primary, opacity: ready ? 1 : 0.5 }]}
              testID="button-prompt-submit"
            >
              <Text style={{ color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{submitLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  sheet: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 12 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 72, fontSize: 15, fontFamily: "Inter_400Regular", textAlignVertical: "top" },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12 },
  cancel: { paddingVertical: 10, paddingHorizontal: 12 },
  submit: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 },
});
