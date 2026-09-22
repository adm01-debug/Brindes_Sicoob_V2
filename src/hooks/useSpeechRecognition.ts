import { useState, useEffect, useCallback } from "react";

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface SpeechRecognitionResult {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

// Tipos do Web Speech API (SpeechRecognition, SpeechRecognitionEvent, etc.)
// já são declarados globalmente em src/types/speech-recognition.d.ts —
// não redeclarar aqui para evitar conflito de merge em `Window`.

export function useSpeechRecognition({
  onResult,
  onError,
  language = "pt-BR",
}: UseSpeechRecognitionOptions = {}): SpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const recognitionInstance = new SpeechRecognitionAPI();
    
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = language;

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) {
          finalTranscript += alt.transcript;
        } else {
          interimTranscript += alt.transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      if (finalTranscript) {
        onResult?.(finalTranscript.trim());
      }
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessages: Record<string, string> = {
        "not-allowed": "Permissão de microfone negada",
        "no-speech": "Nenhuma fala detectada",
        "audio-capture": "Não foi possível capturar áudio",
        "network": "Erro de rede",
        "aborted": "Reconhecimento cancelado",
      };
      
      const message = errorMessages[event.error] || `Erro: ${event.error}`;
      setError(message);
      onError?.(message);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      recognitionInstance.abort();
    };
  }, [isSupported, language, onResult, onError]);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      setTranscript("");
      setError(null);
      try {
        recognition.start();
      } catch (e) {
        // Recognition might already be started
        console.error("Speech recognition error:", e);
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    error,
  };
}