import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturedProviders from "@/components/FeaturedProviders";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturedProviders />
      </main>
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-400 sm:px-6 lg:px-8">
          &copy; {new Date().getFullYear()} DentalHub. All rights reserved.
        </div>
      </footer>
    </>
  );
}
