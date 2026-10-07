"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";

const noopSubscribe = () => () => {};

// A session that ends sooner than this without hearing anything means the
// device is refusing to listen; restarting it would spin forever.
const MIN_SESSION_MS = 1000;
const RESTART_DELAY_MS = 250;

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
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
      setIsListening(false);
    }
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

    let startedAt = 0;
    let heardSomething = false;

    const begin = () => {
      startedAt = Date.now();
      heardSomething = false;
      recognition.start();
    };

    recognition.onresult = (event) => {
      heardSomething = true;
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
      if (event.error === "no-speech") return;
      wantedRef.current = false;
      if (event.error === "aborted") return;
      console.error("Speech recognition error:", event.error);
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Permita o uso do microfone para ditar."
          : "Não foi possível transcrever o áudio."
      );
    };

    recognition.onend = () => {
      setInterim("");
      if (wantedRef.current) {
        if (!heardSomething && Date.now() - startedAt < MIN_SESSION_MS) {
          wantedRef.current = false;
          setError("Ditado por voz não disponível neste aparelho.");
        } else {
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null;
            if (!wantedRef.current) {
              setIsListening(false);
              return;
            }
            try {
              begin();
            } catch {
              wantedRef.current = false;
              setIsListening(false);
            }
          }, RESTART_DELAY_MS);
          return;
        }
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    wantedRef.current = true;
    setError(null);
    try {
      begin();
      setIsListening(true);
    } catch {
      wantedRef.current = false;
      setError("Não foi possível iniciar o microfone.");
    }
  }, []);

  useEffect(() => {
    return () => {
      wantedRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  return { isSupported, isListening, interim, error, start, stop };
}
