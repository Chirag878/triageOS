"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { sendPasswordReset, updatePassword } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: false, message: "" };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    sendPasswordReset,
    initialState,
  );

  return (
    <AuthCard
      title="Reset your password"
      description="We will send a secure reset link to your email."
    >
      <form action={action} className="space-y-4">
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="you@company.com"
        />
        {state.message ? (
          <Message ok={state.ok} message={state.message} />
        ) : null}
        <Button
          disabled={pending}
          className="h-12 w-full rounded-2xl bg-slate-950 hover:bg-slate-800"
        >
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Send reset link <ArrowRight className="ml-2 size-4" />
        </Button>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  return (
    <AuthCard
      title="Choose a new password"
      description="Use the reset link from your email, then set a new password here."
    >
      <form action={action} className="space-y-4">
        <Field
          label="New password"
          name="password"
          type="password"
          placeholder="Minimum 8 characters"
        />
        {state.message ? (
          <Message ok={state.ok} message={state.message} />
        ) : null}
        <Button
          disabled={pending}
          className="h-12 w-full rounded-2xl bg-emerald-700 hover:bg-emerald-800"
        >
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Update password <ArrowRight className="ml-2 size-4" />
        </Button>
      </form>
    </AuthCard>
  );
}

function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full max-w-md rounded-[2rem] border-white/70 bg-white/80 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl">
      <CardHeader className="p-7 pb-3">
        <CardTitle className="text-3xl font-black tracking-[-0.04em]">
          {title}
        </CardTitle>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </CardHeader>
      <CardContent className="p-7 pt-4">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
}: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required
        className="h-12 rounded-2xl bg-white/80 px-4"
      />
    </div>
  );
}

function Message({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
    >
      {message}
    </div>
  );
}
