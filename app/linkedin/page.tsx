import { LinkedInPageShell } from "@/components/letters";
import { ProGate } from "@/components/pro-gate";

export default function LinkedInPage() {
  // RR-26: the LinkedIn profile builder is a Pro feature in the app
  // (native gate; web stays unlocked).
  return (
    <ProGate feature="LinkedIn builder">
      <LinkedInPageShell />
    </ProGate>
  );
}
