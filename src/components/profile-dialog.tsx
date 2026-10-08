"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/auth-screen";
import { supabase } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 6;

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  name?: string;
  email?: string;
}

// The account: change the name shown in the greeting, see the e-mail, and set
// a new password.
export function ProfileDialog({ open, onClose, name, email }: ProfileDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Perfil</DialogTitle>
          <DialogDescription>Seus dados de acesso.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the fields start from the current data. */}
        {open && <ProfileForm name={name} email={email} />}
      </DialogContent>
    </Dialog>
  );
}

function ProfileForm({ name, email }: { name?: string; email?: string }) {
  const [newName, setNewName] = useState(name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordFailed, setPasswordFailed] = useState(false);

  const nameChanged = !!newName.trim() && newName.trim() !== (name ?? "");

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameChanged || savingName) return;
    setSavingName(true);
    setNameMessage(null);
    // The session picks the change up by itself, and with it the greeting.
    const { error } = await supabase.auth.updateUser({
      data: { name: newName.trim() },
    });
    setSavingName(false);
    setNameMessage(error ? "Não foi possível salvar o nome." : "Nome salvo.");
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH || savingPassword) return;
    setSavingPassword(true);
    setPasswordMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    setPasswordFailed(!!error);
    if (error) {
      setPasswordMessage(
        error.message.toLowerCase().includes("different from the old")
          ? "A nova senha precisa ser diferente da anterior."
          : "Não foi possível alterar a senha."
      );
    } else {
      setPassword("");
      setPasswordMessage("Senha alterada.");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={saveName} className="space-y-2">
        <Label htmlFor="profile-name">Nome</Label>
        <Input
          id="profile-name"
          autoComplete="given-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Como quer ser chamado"
          className="h-12 text-base"
        />
        {nameMessage && (
          <p className="text-sm text-muted-foreground">{nameMessage}</p>
        )}
        <Button
          type="submit"
          disabled={!nameChanged || savingName}
          className="h-11 w-full"
        >
          {savingName ? "Salvando..." : "Salvar nome"}
        </Button>
      </form>

      <div className="space-y-1">
        <Label>E-mail</Label>
        <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
          {email ?? "—"}
        </p>
      </div>

      <form onSubmit={savePassword} className="space-y-2 border-t pt-5">
        <Label htmlFor="profile-password">Nova senha</Label>
        <PasswordInput
          id="profile-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Pelo menos 6 caracteres"
        />
        {passwordMessage && (
          <p
            className={
              passwordFailed
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {passwordMessage}
          </p>
        )}
        <Button
          type="submit"
          variant="outline"
          disabled={password.length < MIN_PASSWORD_LENGTH || savingPassword}
          className="h-11 w-full"
        >
          {savingPassword ? "Salvando..." : "Alterar senha"}
        </Button>
      </form>
    </div>
  );
}
