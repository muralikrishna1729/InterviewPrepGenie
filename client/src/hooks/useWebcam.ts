import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWebcamOptions {
  audio?: boolean;
}

/**
 * Adapted from _salvage/useWebcam.ts
 * Extended to optionally capture audio alongside video (needed for interview recording).
 */
export const useWebcam = ({ audio = false }: UseWebcamOptions = {}) => {
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio,
      });

      streamRef.current = stream;
      setHasPermission(true);
      setPermissionError(null);
      setIsActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Permission denied';
      console.error('Webcam permission denied:', error);
      setHasPermission(false);
      setPermissionError(msg);
      throw error;
    }
  }, [audio]);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const getStream = useCallback(() => streamRef.current, []);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  return {
    isActive,
    hasPermission,
    permissionError,
    videoRef,
    streamRef,
    startWebcam,
    stopWebcam,
    getStream,
  };
};
