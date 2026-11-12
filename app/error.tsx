"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="max-w-md">
        <AlertTriangle className="mx-auto h-12 w-12 text-warn" />
        <h1 className="mt-4 text-2xl font-semibold">Something jammed</h1>
        <p className="mt-2 text-muted">Your recorded knowledge is safe in this browser. Try again, or turn on Demo Mode in the header.</p>
        <button onClick={reset} className="mt-6 rounded-xl bg-accent px-5 py-2.5 font-medium text-black hover:brightness-110">
          Try again
        </button>
      </div>
    </div>
  );
}
