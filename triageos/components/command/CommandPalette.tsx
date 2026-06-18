"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Bot,
  CheckCircle2,
  Command as CommandIcon,
  Loader2,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

type AgentPlan = {
  title: string;
  steps: string[];
  safety: string;
};

type AgentResponse = {
  plan?: AgentPlan;
  requiresConfirmation?: boolean;
  result?: string;
  executed?: Record<string, unknown>;
  error?: string;
};

const examples = [
  "Schedule a sync with alex@example.com next Thursday morning and draft a confirmation.",
  "Create a 30 minute demo with maya@example.com tomorrow at 2pm and draft a note.",
  "Draft a friendly reply to sam@example.com saying I can meet tomorrow afternoon.",
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const requestPlan = (confirmed = false) => {
    if (!command.trim()) return;

    startTransition(async () => {
      setError(null);
      setResult(null);

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, confirmed }),
      });
      const payload = (await response.json()) as AgentResponse;

      if (!response.ok || payload.error) {
        setError(payload.error ?? "Unable to plan command.");
        return;
      }

      if (payload.plan) setPlan(payload.plan);
      if (payload.result) setResult(payload.result);
    });
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="TriageOS command palette"
    >
      <Command className="rounded-2xl border border-white/10 bg-slate-950/95 text-white shadow-2xl shadow-emerald-950/30">
        <div className="border-b border-white/10 bg-gradient-to-r from-emerald-400/10 via-sky-400/10 to-purple-400/10 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <CommandIcon className="size-4" /> Command center
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            Type a natural-language workflow. TriageOS will plan first and ask
            before action.
          </p>
        </div>
        <CommandInput
          value={command}
          onValueChange={setCommand}
          placeholder="Schedule a sync, draft a reply, or triage a thread..."
        />
        <CommandList>
          <CommandEmpty>Type a command, then press Generate plan.</CommandEmpty>
          <CommandGroup heading="Try these">
            {examples.map((example) => (
              <CommandItem
                key={example}
                onSelect={() => {
                  setCommand(example);
                  setPlan(null);
                  setResult(null);
                }}
              >
                <Bot className="size-4" /> {example}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>

        <div className="space-y-3 border-t border-slate-100 p-4">
          {error ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {plan ? (
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="font-black tracking-tight">{plan.title}</p>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                {plan.steps.map((step, index) => (
                  <li key={step}>
                    <span className="font-bold text-emerald-200">
                      {index + 1}.
                    </span>{" "}
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs font-semibold text-emerald-300">
                {plan.safety}
              </p>
            </div>
          ) : null}
          {result ? (
            <p className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
              <CheckCircle2 className="mr-2 inline size-4" /> {result}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-full border-white/15 bg-white/10 text-white hover:bg-white/15"
              onClick={() => requestPlan(false)}
              disabled={isPending || !command.trim()}
            >
              {isPending && !plan ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Generate plan
            </Button>
            <Button
              className="rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              onClick={() => requestPlan(true)}
              disabled={isPending || !plan}
            >
              {isPending && plan ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Confirm plan
            </Button>
          </div>
        </div>
      </Command>
    </CommandDialog>
  );
}
