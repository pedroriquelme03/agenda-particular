"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "forgot";

const MIN_PASSWORD_LENGTH = 6;

// Supabase answers in English; these are the cases a person can act on.
function translateError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (text.includes("email not confirmed"))
    return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (text.includes("already registered")) return "Este e-mail já tem uma conta.";
  if (text.includes("rate limit") || text.includes("too many") || text.includes("security purposes"))
    return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  if (text.includes("different from the old"))
    return "A nova senha precisa ser diferente da anterior.";
  if (text.includes("session")) return "O link expirou. Peça um novo.";
  if (text.includes("password")) return "Senha inválida. Use pelo menos 6 caracteres.";
  if (text.includes("email")) return "E-mail inválido.";
  return "Não foi possível continuar. Tente de novo.";
}

function AuthLayout({
  subtitle,
  children,
}: {
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto p-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Minha Agenda</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit =
    !!email.trim() &&
    (mode === "forgot" || password.length >= MIN_PASSWORD_LENGTH) &&
    !busy;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) setError(translateError(signInError.message));
    } else if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) {
        setError(translateError(signUpError.message));
      } else if (!data.session) {
        // The project requires e-mail confirmation before the first sign-in.
        setNotice(
          "Conta criada. Enviamos um link de confirmação para o seu e-mail; abra-o e depois entre aqui."
        );
        setMode("signin");
        setPassword("");
      }
    } else {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin }
      );
      if (resetError) {
        setError(translateError(resetError.message));
      } else {
        // Same message whether or not the e-mail has an account.
        setNotice(
          "Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha."
        );
        setMode("signin");
      }
    }
    setBusy(false);
  };

  return (
    <AuthLayout
      subtitle={
        mode === "signin"
          ? "Entre na sua conta"
          : mode === "signup"
            ? "Crie a sua conta"
            : "Receba um link para criar uma nova senha"
      }
    >
      {mode !== "forgot" && (
        <div className="flex gap-1 rounded-lg border p-1">
          {(["signin", "signup"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                mode === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              {value === "signin" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="auth-email">E-mail</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="h-12 text-base"
          />
        </div>

        {mode !== "forgot" && (
          <div className="space-y-2">
            <Label htmlFor="auth-password">Senha</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Pelo menos 6 caracteres"
              className="h-12 text-base"
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

        <Button type="submit" disabled={!canSubmit} className="h-12 w-full text-base">
          {busy
            ? "Aguarde..."
            : mode === "signin"
              ? "Entrar"
              : mode === "signup"
                ? "Criar conta"
                : "Enviar link"}
        </Button>

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="block w-full text-center text-sm text-muted-foreground underline underline-offset-2"
          >
            Esqueci minha senha
          </button>
        )}
        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="block w-full text-center text-sm text-muted-foreground underline underline-offset-2"
          >
            Voltar para entrar
          </button>
        )}
      </form>
    </AuthLayout>
  );
}

// Shown after opening the reset link from the e-mail: the link signs the user
// in, and here they choose the new password.
export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = password.length >= MIN_PASSWORD_LENGTH && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) setError(translateError(updateError.message));
    else onDone();
  };

  return (
    <AuthLayout subtitle="Crie uma nova senha">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="auth-new-password">Nova senha</Label>
          <Input
            id="auth-new-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Pelo menos 6 caracteres"
            className="h-12 text-base"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={!canSubmit} className="h-12 w-full text-base">
          {busy ? "Aguarde..." : "Salvar nova senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
