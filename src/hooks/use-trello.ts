"use client";

import { useState, useEffect, useCallback } from "react";
import * as trello from "@/lib/trello";
import type { TrelloBoard, TrelloList } from "@/lib/types";

export function useTrello() {
  const [connected, setConnected] = useState(false);
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setConnected(trello.isConfigured());
  }, []);

  const connect = useCallback((apiKey: string, token: string) => {
    trello.configure(apiKey, token);
    setConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    trello.disconnect();
    setConnected(false);
    setBoards([]);
    setLists([]);
    setSelectedBoard("");
  }, []);

  const fetchBoards = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const data = await trello.getBoards();
      setBoards(data);
    } catch (err) {
      console.error("Error fetching boards:", err);
    }
    setLoading(false);
  }, [connected]);

  const fetchLists = useCallback(
    async (boardId: string) => {
      if (!connected) return;
      setSelectedBoard(boardId);
      setLoading(true);
      try {
        const data = await trello.getLists(boardId);
        setLists(data);
      } catch (err) {
        console.error("Error fetching lists:", err);
      }
      setLoading(false);
    },
    [connected]
  );

  const sendToTrello = useCallback(
    async (listId: string, name: string, desc: string) => {
      const card = await trello.createCard(listId, name, desc);
      return card;
    },
    []
  );

  return {
    connected,
    boards,
    lists,
    selectedBoard,
    loading,
    connect,
    disconnect,
    fetchBoards,
    fetchLists,
    sendToTrello,
  };
}
