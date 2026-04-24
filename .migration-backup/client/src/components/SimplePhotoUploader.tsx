import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, Check } from "lucide-react";

interface SimplePhotoUploaderProps {
  onUploadComplete: (objectPath: string, previewUrl: string) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string;
  buttonText?: string;
  className?: string;
}

export function SimplePhotoUploader({
  onUploadComplete,
  onUploadError,
  maxSizeMB = 5,
  acceptedTypes = "image/*",
  buttonText = "Wybierz zdjęcie",
  className,
}: SimplePhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadStatus("error");
      onUploadError?.(`Plik jest za duży. Maksymalny rozmiar to ${maxSizeMB}MB.`);
      return;
    }

    setSelectedFileName(file.name);
    setIsUploading(true);
    setUploadStatus("idle");

    try {
      const uploadParamsResponse = await fetch("/api/objects/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!uploadParamsResponse.ok) {
        throw new Error("Nie udało się przygotować uploadu");
      }

      const uploadParams = await uploadParamsResponse.json();
      const { uploadURL, objectPath, previewUrl } = uploadParams;

      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Nie udało się przesłać pliku");
      }

      setUploadStatus("success");
      onUploadComplete(objectPath, previewUrl);
    } catch (error) {
      setUploadStatus("error");
      const errorMessage = error instanceof Error ? error.message : "Błąd uploadu";
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-photo-file"
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick}
        disabled={isUploading}
        className="w-full"
        data-testid="button-select-photo"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Przesyłanie...
          </>
        ) : uploadStatus === "success" ? (
          <>
            <Check className="mr-2 h-4 w-4 text-green-500" />
            Przesłano
          </>
        ) : uploadStatus === "error" ? (
          <>
            <X className="mr-2 h-4 w-4 text-red-500" />
            Spróbuj ponownie
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {buttonText}
          </>
        )}
      </Button>
      {selectedFileName && uploadStatus === "success" && (
        <p className="mt-1 text-xs text-muted-foreground truncate">
          {selectedFileName}
        </p>
      )}
    </div>
  );
}
