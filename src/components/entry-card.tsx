"use client";

import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  Mic,
  ImageIcon,
  Link2,
  Trash2,
  Check,
  Pencil,
  Paperclip,
  Repeat2,
  Bell,
  ExternalLink,
  Send,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Entry } from "@/lib/types";
import { cn } from "@/lib/utils";

const typeIcons = {
  text: FileText,
  voice: Mic,
  image: ImageIcon,
  link: Link2,
};

const typeLabels = {
  text: "Texto",
  voice: "Voz",
  image: "Imagem",
  link: "Link",
};

interface EntryCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
  onTrelloSend?: (entry: Entry) => void;
  // Marks or unmarks the item as done.
  onToggleDone?: (entry: Entry) => void;
  // Opens the text for editing.
  onEdit?: (entry: Entry) => void;
  // Opens the choice of turning the item into a task or an appointment.
  onConvert?: (entry: Entry) => void;
  // Opens the choice of saved links to attach (notes only).
  onAttachLinks?: (entry: Entry) => void;
  // What is attached: the links of a note, or the notes that use a link.
  attached?: Entry[];
}

export function EntryCard({
  entry,
  onDelete,
  onTrelloSend,
  onToggleDone,
  onEdit,
  onConvert,
  onAttachLinks,
  attached = [],
}: EntryCardProps) {
  const Icon = typeIcons[entry.type];
  const isDone = !!entry.completed_at;
  const isUpcoming =
    !isDone &&
    entry.is_reminder &&
    entry.reminder_date &&
    isFuture(new Date(entry.reminder_date));
  const isOverdue =
    !isDone &&
    entry.is_reminder &&
    entry.reminder_date &&
    isPast(new Date(entry.reminder_date));

  return (
    <Card
      className={cn(
        "transition-colors",
        isDone && "opacity-60",
        isOverdue && "border-destructive/50 bg-destructive/5",
        isUpcoming && "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10"
      )}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleDone && (
            <button
              onClick={() => onToggleDone(entry)}
              aria-label={isDone ? "Desmarcar como feito" : "Marcar como feito"}
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                isDone
                  ? "border-foreground bg-foreground text-background"
                  : "border-muted-foreground/50"
              )}
            >
              {isDone && <Check className="h-3.5 w-3.5" />}
            </button>
          )}
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Badge variant="outline" className="text-xs">
            {typeLabels[entry.type]}
          </Badge>
          {entry.title && (
            <span className="font-semibold truncate">{entry.title}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onTrelloSend && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onTrelloSend(entry)}
              title="Enviar para Trello"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
          {onConvert && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onConvert(entry)}
              title="Transformar em tarefa ou compromisso"
              aria-label="Transformar em tarefa ou compromisso"
            >
              <Repeat2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onAttachLinks && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onAttachLinks(entry)}
              title="Vincular links"
              aria-label="Vincular links"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(entry)}
              title="Editar"
              aria-label="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {entry.content && (
          <p className={cn("text-sm whitespace-pre-wrap", isDone && "line-through")}>
            {entry.content}
          </p>
        )}

        {entry.image_url && (
          <img
            src={entry.image_url}
            alt={entry.title || "Imagem"}
            className="rounded-md max-h-64 object-contain"
          />
        )}

        {entry.link_url && (
          <a
            href={entry.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {entry.link_url}
          </a>
        )}

        {attached.length > 0 && (
          <ul className="space-y-1 border-t pt-2">
            {attached.map((other) => (
              <li key={other.id} className="flex items-center gap-1.5 text-sm">
                {other.link_url ? (
                  <>
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <a
                      href={other.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate text-primary hover:underline"
                    >
                      {other.title || other.link_url}
                    </a>
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate text-muted-foreground">
                      {other.title || other.content.split("\n")[0]}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {entry.is_reminder && entry.reminder_date && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isOverdue && "text-destructive",
              isUpcoming && "text-yellow-600 dark:text-yellow-400"
            )}
          >
            <Bell className="h-3.5 w-3.5" />
            {format(new Date(entry.reminder_date), "dd/MM/yyyy HH:mm")}
            {isOverdue && " (atrasado)"}
            {isDone && " (concluído)"}
          </div>
        )}

        {entry.trello_card_id && (
          <Badge variant="secondary" className="text-xs">
            Trello
          </Badge>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(entry.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
      </CardFooter>
    </Card>
  );
}
