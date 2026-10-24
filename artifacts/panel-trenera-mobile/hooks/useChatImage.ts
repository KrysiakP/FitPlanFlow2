import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadImageToObjectStorage } from "@/lib/api";
import { chatImageProblem } from "@/lib/chatImage";

export interface PickedChatImage {
  objectPath: string;
  localUri: string;
}

/** Pick an image from the gallery and upload it right away; the message then only carries its object path. */
export function useChatImage() {
  const [image, setImage] = useState<PickedChatImage | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pick() {
    if (uploading) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Brak dostępu", "Zezwól na dostęp do galerii w ustawieniach urządzenia.");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      const problem = chatImageProblem({ mimeType: asset.mimeType, fileSize: asset.fileSize });
      if (problem) {
        Alert.alert("Nie można wysłać tego pliku", problem);
        return;
      }
      setUploading(true);
      const uploaded = await uploadImageToObjectStorage(asset.uri, asset.mimeType ?? "image/jpeg");
      setImage({ objectPath: uploaded.objectPath, localUri: asset.uri });
    } catch {
      Alert.alert("Nie udało się przesłać zdjęcia", "Sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setUploading(false);
    }
  }

  return { image, uploading, pick, clear: () => setImage(null), restore: (picked: PickedChatImage) => setImage(picked) };
}
