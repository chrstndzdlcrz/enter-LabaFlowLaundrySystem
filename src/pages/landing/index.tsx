import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/public-layout";
import { fetchShopSettings } from "@/lib/api/settings";
import { CtaSection } from "./cta-section";
import { FaqSection } from "./faq-section";
import { HeroSection } from "./hero-section";
import { HowItWorksSection } from "./how-it-works-section";
import { ServicesSection } from "./services-section";

const Landing = () => {
  const { data: settings } = useQuery({ queryKey: ["shop-settings"], queryFn: fetchShopSettings });

  return (
    <PublicLayout>
      <HeroSection shopName={settings?.shop_name ?? "Lab-a-Day Laundry Shop"} />
      <ServicesSection />
      <HowItWorksSection />
      <FaqSection />
      <CtaSection settings={settings} />
    </PublicLayout>
  );
};

export default Landing;
