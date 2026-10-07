"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";

import { authHeader } from "@/lib/supabase";

const noopSubscribe = () => () => {};

// Low bitrate is plenty for speech and keeps the upload small.
const AUDIO_BITS_PER_SECOND = 32000;
const MAX_RECORDING_MS = 5 * 60 * 1000;

function canRecord() {
  return "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;
}

// Records the microphone and sends the audio to /api/transcribe. The browser's own
// speech recognition is not used because it returns nothing in an installed iOS app.
// `onText` receives the transcribed text when a recording finishes.
export function useDictation(onText: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discardRef = useRef(false);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const isSupported = useSyncExternalStore(
    noopSubscribe,
    canRecord,
    () => false
  );

  const transcribe = useCallback(async (audio: Blob) => {
    setIsTranscribing(true);
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": audio.type || "audio/webm",
          ...(await authHeader()),
        },
        body: audio,
      });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) {
        setError(data.error || "Não foi possível transcrever o áudio.");
      } else if (data.text) {
        onTextRef.current(data.text);
      } else {
        setError("Não entendi o áudio. Tente de novo.");
      }
    } catch {
      setError("Sem conexão para transcrever o áudio.");
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const start = useCallback(async () => {
    if (!canRecord() || recorderRef.current?.state === "recording") return;
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Permita o uso do microfone para ditar.");
      return;
    }

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, {
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      setIsListening(false);
      if (discardRef.current) return;
      const audio = new Blob(chunks, { type: recorder.mimeType });
      if (audio.size > 0) transcribe(audio);
    };

    discardRef.current = false;
    recorderRef.current = recorder;
    recorder.start();
    setIsListening(true);
    stopTimerRef.current = setTimeout(stop, MAX_RECORDING_MS);
  }, [stop, transcribe]);

  useEffect(() => {
    return () => {
      // Leaving the screen: release the microphone and drop the recording.
      discardRef.current = true;
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
  }, []);

  return { isSupported, isListening, isTranscribing, error, start, stop };
}
