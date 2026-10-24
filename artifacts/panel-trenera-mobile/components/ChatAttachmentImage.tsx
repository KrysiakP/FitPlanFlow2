import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { API_BASE_URL, getMobileToken } from "@/context/AuthContext";
import { chatImageSource } from "@/lib/chatImage";

/** The image of a chat message. Files of the conversation are private, so they are loaded with the login token. */
export function ChatAttachmentImage({ attachmentUrl }: { attachmentUrl: string }) {
  const source = chatImageSource(attachmentUrl, API_BASE_URL);
  const [token, setToken] = useState<string | null | undefined>(source.needsAuth ? undefined : null);

  useEffect(() => {
    if (!source.needsAuth) return;
    let cancelled = false;
    void getMobileToken().then((value) => {
      if (!cancelled) setToken(value);
    });
    return () => {
      cancelled = true;
    };
  }, [source.needsAuth]);

  if (token === undefined) {
    return (
      <View style={[styles.image, styles.loading]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: source.uri, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) }}
      style={styles.image}
      resizeMode="cover"
      accessibilityLabel="Zdjęcie w wiadomości"
      testID="chat-attachment-image"
    />
  );
}

const styles = StyleSheet.create({
  image: { width: 220, height: 220, borderRadius: 12 },
  loading: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(127,127,127,0.15)" },
});
