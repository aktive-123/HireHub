import HeroSection from '../../components/landing/HeroSection'
import FeaturedJobsSection from '../../components/landing/FeaturedJobsSection'
import TrustedCompaniesSection from '../../components/landing/TrustedCompaniesSection'
import HowItWorksSection from '../../components/landing/HowItWorksSection'
import PopularCategoriesSection from '../../components/landing/PopularCategoriesSection'
import WhyChooseUsSection from '../../components/landing/WhyChooseUsSection'
import TestimonialsSection from '../../components/landing/TestimonialsSection'
import FinalCtaSection from '../../components/landing/FinalCtaSection'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedJobsSection />
      <TrustedCompaniesSection />
      <HowItWorksSection />
      <PopularCategoriesSection />
      <WhyChooseUsSection />
      <TestimonialsSection />
      <FinalCtaSection />
    </>
  )
}