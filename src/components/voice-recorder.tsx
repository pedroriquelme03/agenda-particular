"use client";

import { Mic, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";

interface VoiceRecorderProps {
  onSave: (transcript: string, audioBlob: Blob | null) => void;
}

export function VoiceRecorder({ onSave }: VoiceRecorderProps) {
  const {
    isRecording,
    transcript,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
    isSupported,
  } = useVoiceRecorder();

  if (!isSupported) {
    return (
      <p className="text-sm text-muted-foreground">
        Seu navegador nao suporta gravacao de voz.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <Button onClick={startRecording} variant="outline" size="sm">
            <Mic className="h-4 w-4 mr-1" />
            Gravar
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            variant="destructive"
            size="sm"
          >
            <Square className="h-4 w-4 mr-1" />
            Parar
          </Button>
        )}
        {transcript && !isRecording && (
          <>
            <Button onClick={resetRecording} variant="ghost" size="sm">
              <RotateCcw className="h-4 w-4 mr-1" />
              Limpar
            </Button>
            <Button
              onClick={() => onSave(transcript, audioBlob)}
              size="sm"
            >
              Salvar
            </Button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">Gravando...</span>
        </div>
      )}

      {transcript && (
        <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
          {transcript}
        </div>
      )}
    </div>
  );
}
