"use client";
import { CaptureStudio } from "@/components/CaptureStudio";
import { Eyebrow } from "@/components/ui";

export default function CapturePage() {
  return (
    <div className="space-y-5">
      <div>
        <Eyebrow className="text-accent/90">Capture Studio</Eyebrow>
        <h1 className="mt-2 text-balance text-3xl font-semibold leading-[1.05] sm:text-4xl">Talk. We&apos;ll turn it into a repair guide.</h1>
        <p className="mt-2 text-muted">Hindi, Kannada, English or a mix. Rambling is fine; that&apos;s where the tribal knowledge hides.</p>
      </div>
      <CaptureStudio />
    </div>
  );
}
