"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTrello } from "@/hooks/use-trello";
import type { Entry } from "@/lib/types";

interface TrelloConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrelloConfigDialog({
  open,
  onOpenChange,
}: TrelloConfigDialogProps) {
  const { connected, connect, disconnect } = useTrello();
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");

  const handleConnect = () => {
    if (apiKey.trim() && token.trim()) {
      connect(apiKey.trim(), token.trim());
      setApiKey("");
      setToken("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Trello</DialogTitle>
        </DialogHeader>

        {connected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Trello conectado com sucesso.
            </p>
            <Button variant="destructive" onClick={disconnect}>
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para conectar, voce precisa de uma API Key e um Token do Trello.
            </p>
            <div>
              <Label>API Key</Label>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Sua API Key do Trello"
              />
            </div>
            <div>
              <Label>Token</Label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Seu Token do Trello"
              />
            </div>
            <Button onClick={handleConnect} disabled={!apiKey || !token}>
              Conectar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TrelloSendDialogProps {
  entry: Entry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: (entryId: string, cardId: string) => void;
}

export function TrelloSendDialog({
  entry,
  open,
  onOpenChange,
  onSent,
}: TrelloSendDialogProps) {
  const { connected, boards, lists, fetchBoards, fetchLists, sendToTrello, loading } =
    useTrello();
  const [selectedList, setSelectedList] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && connected) {
      fetchBoards();
    }
  }, [open, connected, fetchBoards]);

  const handleSend = async () => {
    if (!entry || !selectedList) return;
    setSending(true);
    try {
      const card = await sendToTrello(
        selectedList,
        entry.title || entry.content.slice(0, 50),
        entry.content
      );
      onSent(entry.id, card.id);
      onOpenChange(false);
    } catch (err) {
      console.error("Error sending to Trello:", err);
    }
    setSending(false);
  };

  if (!connected) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para Trello</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Configure o Trello primeiro nas configuracoes.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar para Trello</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Board</Label>
            <Select onValueChange={(val: unknown) => { if (typeof val === "string") fetchLists(val); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um board" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lists.length > 0 && (
            <div>
              <Label>Lista</Label>
              <Select onValueChange={(val: unknown) => setSelectedList(typeof val === "string" ? val : "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma lista" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={!selectedList || sending || loading}
          >
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
