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
import { TeamSection } from "@/features/team";

export default function HomePage() {
  return (
    <>
      <Hero />
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
