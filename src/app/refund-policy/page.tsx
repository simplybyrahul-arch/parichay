import { LegalPage } from "@/components/legal/LegalPage";
import { legalPages } from "@/lib/legal/legalContent";

export default function RefundPolicyPage() {
    return <LegalPage page={legalPages.refund} />;
}
