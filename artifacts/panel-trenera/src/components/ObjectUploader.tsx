// Code adapted from javascript_object_storage blueprint
// Component for uploading files to object storage with Uppy v4
import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import "@uppy/core/css/style.css";
import "@uppy/dashboard/css/style.css";

import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const uppyRef = useRef<Uppy | null>(null);
  const dashboardInitialized = useRef(false);

  const handleComplete = useCallback((result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    onComplete?.(result);
    setShowModal(false);
  }, [onComplete]);

  useEffect(() => {
    if (!uppyRef.current) {
      uppyRef.current = new Uppy({
        restrictions: {
          maxNumberOfFiles,
          maxFileSize,
        },
        autoProceed: false,
      }).use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      });
    }

    const uppy = uppyRef.current;
    uppy.on("complete", handleComplete);

    return () => {
      uppy.off("complete", handleComplete);
    };
  }, [maxNumberOfFiles, maxFileSize, onGetUploadParameters, handleComplete]);

  useEffect(() => {
    const uppy = uppyRef.current;
    if (!uppy) return;

    if (showModal && !dashboardInitialized.current) {
      const initDashboard = () => {
        if (dashboardRef.current && uppyRef.current && !dashboardInitialized.current) {
          uppyRef.current.use(Dashboard, {
            target: dashboardRef.current,
            inline: true,
            proudlyDisplayPoweredByUppy: false,
            height: 350,
            width: '100%',
            locale: {
              strings: {
                dropPasteFiles: 'Upuść pliki tutaj lub %{browseFiles}',
                browseFiles: 'wybierz z dysku',
                uploadComplete: 'Przesyłanie zakończone',
                uploadPaused: 'Przesyłanie wstrzymane',
                resumeUpload: 'Wznów przesyłanie',
                pauseUpload: 'Wstrzymaj przesyłanie',
                retryUpload: 'Ponów przesyłanie',
                cancelUpload: 'Anuluj przesyłanie',
                xFilesSelected: {
                  0: '%{smart_count} plik wybrany',
                  1: '%{smart_count} plików wybranych',
                },
                uploadingXFiles: {
                  0: 'Przesyłanie %{smart_count} pliku',
                  1: 'Przesyłanie %{smart_count} plików',
                },
                processingXFiles: {
                  0: 'Przetwarzanie %{smart_count} pliku',
                  1: 'Przetwarzanie %{smart_count} plików',
                },
              },
            },
          });
          dashboardInitialized.current = true;
        }
      };
      
      // Use requestAnimationFrame to wait for DOM to be ready
      requestAnimationFrame(() => {
        requestAnimationFrame(initDashboard);
      });
    }

    if (!showModal && dashboardInitialized.current) {
      const dashboardPlugin = uppy.getPlugin('Dashboard');
      if (dashboardPlugin) {
        uppy.removePlugin(dashboardPlugin);
      }
      uppy.cancelAll();
      dashboardInitialized.current = false;
    }
  }, [showModal]);

  useEffect(() => {
    return () => {
      if (uppyRef.current) {
        uppyRef.current.destroy();
        uppyRef.current = null;
      }
    };
  }, []);

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName} type="button">
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl">
          <div ref={dashboardRef} className="min-h-[300px]"></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
