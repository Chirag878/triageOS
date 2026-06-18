"use client";

import { useState, useTransition } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AiItem = {
  id: string;
  fromEmail: string;
  subject: string;
  summary: string | null;
  snippet: string | null;
  suggestedReply: string | null;
  workflowType: string;
  priorityLabel: string;
  status: string;
};

type ApiResponse = { item?: AiItem; error?: string };

export function AiWorkflowDashboard({
  initialItems,
}: {
  initialItems: AiItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const generateAi = (triageItemId: string) => {
    startTransition(async () => {
      setError(null);
      setActiveId(triageItemId);
      const response = await fetch("/api/triage/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triageItemId }),
      });
      const payload = (await response.json()) as ApiResponse;
      setActiveId(null);

      if (!response.ok || payload.error || !payload.item) {
        setError(payload.error ?? "Unable to generate AI card.");
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === payload.item?.id ? { ...item, ...payload.item } : item,
        ),
      );
    });
  };

  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/80 shadow-sm">
      <CardHeader>
        <Badge className="w-fit rounded-full bg-purple-100 text-purple-800 hover:bg-purple-100">
          <Sparkles className="mr-1.5 size-3.5" /> OpenAI workflow cards
        </Badge>
        <CardTitle className="mt-4 text-3xl font-black tracking-tight">
          AI triage lab
        </CardTitle>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Generate or regenerate structured AI cards separately from Gmail sync
          and Calendar sync.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <Bot className="mx-auto size-10 text-slate-400" />
            <h3 className="mt-4 text-xl font-black tracking-tight">
              No Gmail cards yet
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Sync Gmail first, then return here to generate AI workflow cards.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full capitalize"
                      >
                        {item.workflowType.replaceAll("_", " ")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="rounded-full capitalize"
                      >
                        {item.priorityLabel}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-black tracking-tight">
                      {item.subject}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      From {item.fromEmail}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => generateAi(item.id)}
                    disabled={isPending && activeId === item.id}
                    className="rounded-full bg-purple-700 text-white hover:bg-purple-600"
                  >
                    {activeId === item.id ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-4" />
                    )}
                    {item.suggestedReply ? "Regenerate" : "Generate"}
                  </Button>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {item.summary ?? item.snippet ?? "No summary yet."}
                </p>
                {item.suggestedReply ? (
                  <div className="mt-4 rounded-2xl bg-purple-50 p-4 text-sm leading-6 text-purple-950">
                    {item.suggestedReply}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
