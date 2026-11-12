import Link from "next/link";
import { Ghost } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <Ghost className="mx-auto h-14 w-14 text-accent" />
        <h1 className="mt-4 text-3xl font-semibold">Nothing recorded here</h1>
        <p className="mt-2 text-muted">This page vanished like an undocumented fix.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:bg-orange-400">
          Back to the Risk Radar
        </Link>
      </div>
    </div>
  );
}
