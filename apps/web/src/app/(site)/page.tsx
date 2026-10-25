import { OrganizationLeadForm } from "@/features/contact";
import { GiftRequestForm } from "@/features/gift-request";
import {
  CollectionSection,
  ContactSection,
  HandbookPreview,
  Hero,
  ImpactSection,
  JourneySection,
  Manifesto,
  ProgramsSection,
  RoadmapSection,
} from "@/features/home";
import { LaviAgentIntroSection, getLaviagentCatalog } from "@/features/laviagent";
import { TeamSection } from "@/features/team";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LaviAgentIntroSection materials={getLaviagentCatalog().materials} />
      <Manifesto />
      <JourneySection />
      <ProgramsSection />
      <CollectionSection />
      <HandbookPreview />
      <ImpactSection />
      <RoadmapSection />
      <TeamSection />
      <ContactSection
        organizationForm={<OrganizationLeadForm />}
        personalForm={<GiftRequestForm />}
      />
    </>
  );
}
