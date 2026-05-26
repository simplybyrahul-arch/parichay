import { LegalPage } from "@/components/legal/LegalPage";
import { legalPages } from "@/lib/legal/legalContent";

export default function CreatorAgreementPage() {
    return <LegalPage page={legalPages.creatorAgreement} />;
}
