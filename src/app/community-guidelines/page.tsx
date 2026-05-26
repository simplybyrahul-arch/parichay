import { LegalPage } from "@/components/legal/LegalPage";
import { legalPages } from "@/lib/legal/legalContent";

export default function CommunityGuidelinesPage() {
    return <LegalPage page={legalPages.communityGuidelines} />;
}
