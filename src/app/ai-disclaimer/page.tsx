import { LegalPage } from "@/components/legal/LegalPage";
import { legalPages } from "@/lib/legal/legalContent";

export default function AiDisclaimerPage() {
    return <LegalPage page={legalPages.aiDisclaimer} />;
}
