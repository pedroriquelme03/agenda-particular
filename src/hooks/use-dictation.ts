"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";

const noopSubscribe = () => () => {};

function hasSpeechRecognition() {
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

// Speech-to-text only (no audio file). `onFinal` receives each finished phrase.
export function useDictation(onFinal: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wantedRef = useRef(false);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const isSupported = useSyncExternalStore(
    noopSubscribe,
    hasSpeechRecognition,
    () => false
  );

  const stop = useCallback(() => {
    wantedRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!hasSpeechRecognition() || wantedRef.current) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    // Android Chrome repeats phrases in continuous mode, so each session takes
    // one phrase and `onend` starts the next while the user keeps dictating.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "pt-BR";

    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onFinalRef.current(text);
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.error("Speech recognition error:", event.error);
      wantedRef.current = false;
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Permita o uso do microfone para ditar."
          : "Não foi possível transcrever o áudio."
      );
    };

    recognition.onend = () => {
      setInterim("");
      if (wantedRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          wantedRef.current = false;
        }
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    wantedRef.current = true;
    setError(null);
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      wantedRef.current = false;
      setError("Não foi possível iniciar o microfone.");
    }
  }, []);

  useEffect(() => {
    return () => {
      wantedRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return { isSupported, isListening, interim, error, start, stop };
}
