"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { signInWithPassword, signUpWithPassword } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const initialState = { ok: false, message: "" };

export function AuthForm() {
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithPassword,
    initialState,
  );

  return (
    <Card className="w-full max-w-md rounded-[2rem] border-white/70 bg-white/80 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl">
      <CardHeader className="p-7 pb-3">
        <CardTitle className="text-3xl font-black tracking-[-0.04em]">
          Enter TriageOS
        </CardTitle>
        <p className="text-sm leading-6 text-slate-600">
          App auth is separate from Corsair. Gmail and Calendar connect after
          sign-in.
        </p>
      </CardHeader>
      <CardContent className="p-7 pt-4">
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-emerald-50">
            <TabsTrigger value="signin" className="rounded-xl">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-xl">
              Sign up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form action={signInAction} className="space-y-4">
              <AuthField
                label="Email"
                name="email"
                type="email"
                placeholder="you@company.com"
              />
              <AuthField
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
              />
              {signInState.message ? (
                <AuthMessage
                  ok={signInState.ok}
                  message={signInState.message}
                />
              ) : null}
              <Button
                disabled={signInPending}
                className="h-12 w-full rounded-2xl bg-slate-950 hover:bg-slate-800"
              >
                {signInPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Sign in <ArrowRight className="ml-2 size-4" />
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <form action={signUpAction} className="space-y-4">
              <AuthField
                label="Full name"
                name="fullName"
                type="text"
                placeholder="Alex Chen"
              />
              <AuthField
                label="Email"
                name="email"
                type="email"
                placeholder="you@company.com"
              />
              <AuthField
                label="Password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
              />
              {signUpState.message ? (
                <AuthMessage
                  ok={signUpState.ok}
                  message={signUpState.message}
                />
              ) : null}
              <Button
                disabled={signUpPending}
                className="h-12 w-full rounded-2xl bg-emerald-700 hover:bg-emerald-800"
              >
                {signUpPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Create account <ArrowRight className="ml-2 size-4" />
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function AuthField({
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

function AuthMessage({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
    >
      {message}
    </div>
  );
}
