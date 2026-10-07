"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LinkInputProps {
  onSave: (url: string) => void;
}

export function LinkInput({ onSave }: LinkInputProps) {
  const [url, setUrl] = useState("");

  const handleSave = () => {
    if (!url.trim()) return;
    let normalized = url.trim();
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }
    onSave(normalized);
    setUrl("");
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="https://exemplo.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          className="pl-9"
        />
      </div>
      <Button onClick={handleSave} size="sm">
        Salvar
      </Button>
    </div>
  );
}
