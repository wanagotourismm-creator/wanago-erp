"use client";

import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { timeAgo } from "@/lib/utils/helpers";
import { useAnnouncementsFeed } from "@/modules/hrms/announcements-view/hooks/useAnnouncementsFeed";

export function AnnouncementsPage() {
  const { user } = useAuthStore();
  const canCompose = !!user && hasPermission(user.systemRole, "hrms:manage");
  const { messages, loading, post } = useAnnouncementsFeed();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    if (!text.trim()) return;
    setError(null);
    setPosting(true);
    try {
      await post(text);
      setText("");
    } catch {
      setError("Failed to post announcement.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Announcements" description="Official updates for your office" />

      {canCompose && (
        <Card>
          <div className="space-y-3">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <textarea
              rows={3}
              placeholder="Write an announcement..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary"
            />
            <div className="flex justify-end">
              <Button size="sm" icon={<Send size={14} />} loading={posting} onClick={handlePost}>
                Post
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : messages.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Megaphone size={16} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{m.senderName}</p>
                    <span className="text-xs text-muted-foreground">{timeAgo(m.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{m.text}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
