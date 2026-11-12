"use client";
import { CaptureStudio } from "@/components/CaptureStudio";
import { Eyebrow } from "@/components/ui";

export default function CapturePage() {
  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>Capture Studio</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold">Talk. We&apos;ll turn it into a repair guide.</h1>
        <p className="text-muted">Hindi, Kannada, English or a mix. Rambling is fine; that&apos;s where the tribal knowledge hides.</p>
      </div>
      <CaptureStudio />
    </div>
  );
}
