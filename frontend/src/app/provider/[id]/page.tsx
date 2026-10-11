import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Star, Clock, Calendar, CheckCircle2, Phone, GraduationCap } from "lucide-react";
import BookingWidget from "@/components/BookingWidget";

// Types
interface Service {
  id: string;
  name_en: string;
  name_ar: string;
  category: string;
  price: string;
}

interface PortfolioImage {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
}

interface Clinic {
  id: string;
  name_en: string;
  name_ar: string;
  address: string;
  lat: number;
  lng: number;
}

interface ProviderProfile {
  id: string;
  role: "doctor" | "student";
  name_en: string;
  name_ar: string;
  avatar_url: string | null;
  gender: string;
  bio_en: string;
  bio_ar: string;
  years_of_experience?: number;
  consultation_fee?: string;
  university?: string;
  academic_year?: number;
  clinics: Clinic[];
  services: Service[];
  portfolio: PortfolioImage[];
}

async function getProviderData(id: string): Promise<ProviderProfile | null> {
  // Using localhost:3001 as required since it's a server component (bypassing Next.js rewrites)
  try {
    const res = await fetch(`http://localhost:3001/api/providers/${id}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch provider data");
    }
    return res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default async function ProviderProfilePage({ params }: { params: { id: string } }) {
  const provider = await getProviderData(params.id);

  if (!provider) {
    notFound();
  }

  const isDoctor = provider.role === "doctor";
  const defaultAvatar = provider.gender === "female" ? "/avatars/default-female.png" : "/avatars/default-male.png";
  // Assuming a static rating for the MVP since reviews aren't fully implemented yet
  const rating = 4.8;
  const reviewsCount = 124;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ─── Header Section ─── */}
      <div className="bg-white border-b border-slate-200 pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0">
              <Image
                src={provider.avatar_url ? `http://localhost:3001${provider.avatar_url}` : defaultAvatar}
                alt={provider.name_en}
                fill
                className="rounded-full object-cover border-4 border-white shadow-lg"
              />
              <div className="absolute bottom-2 right-2 bg-green-500 w-4 h-4 rounded-full border-2 border-white shadow-sm" title="Active"></div>
            </div>

            <div className="flex-1 text-center md:text-left mt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold mb-3">
                <CheckCircle2 className="w-4 h-4" />
                {isDoctor ? "Verified Doctor" : "Dental Student"}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
                Dr. {provider.name_en}
              </h1>
              <p className="text-lg text-slate-600 mb-4">
                {isDoctor 
                  ? `${provider.years_of_experience || 0} Years of Experience`
                  : `Year ${provider.academic_year || 1} at ${provider.university || 'University'}`}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-1.5 text-amber-500 font-medium bg-amber-50 px-2 py-1 rounded-md">
                  <Star className="w-4 h-4 fill-current" />
                  {rating} <span className="text-slate-400">({reviewsCount} reviews)</span>
                </div>
                {provider.clinics.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {provider.clinics[0].name_en}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Usually responds in 1 hr
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column */}
          <div className="flex-1 space-y-8">
            {/* About */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">About</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line text-lg">
                {provider.bio_en || "This provider hasn't added a bio yet."}
              </p>
            </section>

            {/* Services */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Services & Prices</h2>
              {provider.services.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {provider.services.map((service) => (
                    <div key={service.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 transition-colors">
                      <div>
                        <h3 className="font-semibold text-slate-800">{service.name_en}</h3>
                        <p className="text-sm text-slate-500">{service.category}</p>
                      </div>
                      <div className="font-bold text-blue-600">
                        {service.price ? `EGP ${parseFloat(service.price).toFixed(0)}` : "Free"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No specific services listed yet.</p>
              )}
            </section>

            {/* Portfolio / Gallery */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Before & After Gallery</h2>
              {provider.portfolio.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {provider.portfolio.map((img) => (
                    <div key={img.id} className="group relative rounded-xl overflow-hidden shadow-sm border border-slate-200">
                      <div className="aspect-[4/3] relative">
                        <Image
                          src={`http://localhost:3001${img.image_url}`}
                          alt={img.title || "Portfolio case"}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <h3 className="text-white font-semibold truncate">{img.title || "Case Study"}</h3>
                        {img.description && <p className="text-white/80 text-sm line-clamp-2 mt-1">{img.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-slate-500">No portfolio images uploaded yet.</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Sticky Booking Widget */}
          <div className="lg:w-[400px]">
            <div className="sticky top-8">
              <BookingWidget providerId={provider.id} role={provider.role} fee={provider.consultation_fee} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
