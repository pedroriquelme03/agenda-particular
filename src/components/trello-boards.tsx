"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  List,
  CreditCard,
  ExternalLink,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as trello from "@/lib/trello";
import type { TrelloBoard, TrelloList, TrelloCard } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BoardWithLists extends TrelloBoard {
  lists?: (TrelloList & { cards?: TrelloCard[] })[];
  expanded?: boolean;
}

export function TrelloBoards() {
  const [boards, setBoards] = useState<BoardWithLists[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBoard, setExpandedBoard] = useState<string | null>(null);
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [loadingLists, setLoadingLists] = useState<string | null>(null);
  const [loadingCards, setLoadingCards] = useState<string | null>(null);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await trello.getBoards();
      setBoards(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error("Error fetching boards:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const toggleBoard = useCallback(
    async (boardId: string) => {
      if (expandedBoard === boardId) {
        setExpandedBoard(null);
        return;
      }
      setExpandedBoard(boardId);

      const board = boards.find((b) => b.id === boardId);
      if (board?.lists) return;

      setLoadingLists(boardId);
      try {
        const lists = await trello.getLists(boardId);
        setBoards((prev) =>
          prev.map((b) => (b.id === boardId ? { ...b, lists } : b))
        );
      } catch (err) {
        console.error("Error fetching lists:", err);
      }
      setLoadingLists(null);
    },
    [expandedBoard, boards]
  );

  const toggleList = useCallback(
    async (listId: string, boardId: string) => {
      if (expandedList === listId) {
        setExpandedList(null);
        return;
      }
      setExpandedList(listId);

      const board = boards.find((b) => b.id === boardId);
      const list = board?.lists?.find((l) => l.id === listId);
      if (list && "cards" in list && list.cards) return;

      setLoadingCards(listId);
      try {
        const cards = await trello.getCards(listId);
        setBoards((prev) =>
          prev.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  lists: b.lists?.map((l) =>
                    l.id === listId ? { ...l, cards } : l
                  ),
                }
              : b
          )
        );
      } catch (err) {
        console.error("Error fetching cards:", err);
      }
      setLoadingCards(null);
    },
    [expandedList, boards]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando quadros...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm text-destructive">Erro ao buscar quadros: {error}</p>
        <Button variant="outline" size="sm" onClick={fetchBoards}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum quadro encontrado no Trello.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {boards.map((board) => (
        <Card key={board.id} className="overflow-hidden">
          <button
            onClick={() => toggleBoard(board.id)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
          >
            {expandedBoard === board.id ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <LayoutGrid className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium text-sm">{board.name}</span>
          </button>

          {expandedBoard === board.id && (
            <CardContent className="pt-0 pb-2 pl-8">
              {loadingLists === board.id ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando listas...
                </div>
              ) : board.lists && board.lists.length > 0 ? (
                <div className="space-y-1">
                  {board.lists.map((list) => (
                    <div key={list.id}>
                      <button
                        onClick={() => toggleList(list.id, board.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover:bg-muted/50 transition-colors"
                      >
                        {expandedList === list.id ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <List className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm">{list.name}</span>
                        {"cards" in list && list.cards && (
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {list.cards.length}
                          </Badge>
                        )}
                      </button>

                      {expandedList === list.id && (
                        <div className="ml-6 space-y-1 py-1">
                          {loadingCards === list.id ? (
                            <div className="flex items-center gap-2 py-2 px-3 text-sm text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Carregando cards...
                            </div>
                          ) : list.cards && list.cards.length > 0 ? (
                            list.cards.map((card) => (
                              <div
                                key={card.id}
                                className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/30 text-sm"
                              >
                                <CreditCard className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium">
                                    {card.name}
                                  </span>
                                  {card.desc && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                      {card.desc}
                                    </p>
                                  )}
                                </div>
                                <a
                                  href={card.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground px-3 py-2">
                              Nenhum card nesta lista.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  Nenhuma lista neste quadro.
                </p>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
