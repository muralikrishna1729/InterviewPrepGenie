import { useState, useRef, useCallback } from 'react';

/**
 * Records video+audio from an existing MediaStream using MediaRecorder.
 * Adapted from _salvage/useMicRecorder.ts — now captures video+audio together
 * from the webcam stream rather than audio-only.
 */
export const useMediaRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async (stream: MediaStream): Promise<void> => {
    if (!stream) throw new Error('No media stream provided');

    chunksRef.current = [];
    setDuration(0);

    // Pick best supported mimeType
    const mimeType =
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(1000); // collect chunks every 1s
    setIsRecording(true);

    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(new Blob());
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType ?? 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        resolve(blob);
        setIsRecording(false);
        setDuration(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  /** Convert a Blob to raw base64 string (prefix-stripped). */
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!blob || blob.size === 0) {
        return reject(new Error('Recording is empty'));
      }
      console.log(`[blobToBase64] blob.size=${blob.size} type=${blob.type}`);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result) {
          return reject(new Error('FileReader result is empty'));
        }
        // data URLs look like: data:<mime>;base64,<payload>
        // The MIME may itself contain commas (e.g. video/webm;codecs=vp9,opus),
        // so we must NOT split on the first comma — instead find the 'base64,'
        // marker and take everything after it.
        const base64MarkerIdx = result.indexOf('base64,');
        const b64 = base64MarkerIdx !== -1
          ? result.slice(base64MarkerIdx + 'base64,'.length)
          : result;
        console.log(`[blobToBase64] stripped b64 length=${b64.length}`);
        if (!b64 || b64.length < 100) {
          return reject(new Error('Recording appears empty, please try again'));
        }
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    blobToBase64,
  };
};
