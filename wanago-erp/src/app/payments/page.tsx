import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payments",
};

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="max-w-xl rounded-3xl border border-muted/20 bg-card p-10 text-center shadow-sm">
        <h1 className="text-3xl font-semibold">Payments</h1>
        <p className="mt-4 text-base text-muted-foreground">
          This page is currently a placeholder. The Payments section will be implemented here.
        </p>
      </div>
    </div>
  );
}
