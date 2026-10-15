import { CoverPageShell } from "@/components/letters";
import { ProGate } from "@/components/pro-gate";

export default function CoverPage() {
  // RR-26: the cover letter generator is a Pro feature in the app
  // (native gate; web stays unlocked).
  return (
    <ProGate feature="Cover letters">
      <CoverPageShell />
    </ProGate>
  );
}
