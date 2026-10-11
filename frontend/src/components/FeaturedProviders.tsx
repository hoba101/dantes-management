import {
  StarIcon,
  StethoscopeIcon,
  GraduationCapIcon,
  CalendarIcon,
  MapPinIcon,
} from "@/components/icons";

const providers = [
  {
    name: "Dr. Youssef Mansour",
    specialty: "Orthodontics",
    location: "Cairo, Egypt",
    rating: 4.9,
    reviews: 128,
    image: "YM",
    fee: "350 EGP",
  },
  {
    name: "Dr. Laila Hassan",
    specialty: "Endodontics",
    location: "Alexandria, Egypt",
    rating: 4.8,
    reviews: 96,
    image: "LH",
    fee: "400 EGP",
  },
  {
    name: "Ahmed Samir",
    specialty: "General Dentistry",
    location: "Giza, Egypt",
    rating: 4.9,
    reviews: 43,
    image: "AS",
    fee: "Free",
    student: true,
  },
  {
    name: "Dr. Nour El-Din",
    specialty: "Cosmetic Dentistry",
    location: "Cairo, Egypt",
    rating: 4.7,
    reviews: 204,
    image: "NE",
    fee: "500 EGP",
  },
  {
    name: "Mariam Adel",
    specialty: "Pediatric Dentistry",
    location: "Mansoura, Egypt",
    rating: 4.8,
    reviews: 31,
    image: "MA",
    fee: "Free",
    student: true,
  },
  {
    name: "Dr. Karim Abdo",
    specialty: "Oral Surgery",
    location: "Cairo, Egypt",
    rating: 4.9,
    reviews: 167,
    image: "KA",
    fee: "600 EGP",
  },
];

export default function FeaturedProviders() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Featured Providers
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Top-rated doctors and students ready to help
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <div
              key={p.name}
              className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-100/30"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ${
                      p.student ? "bg-amber-500" : "bg-teal-600"
                    }`}
                  >
                    {p.image}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      {p.student ? (
                        <GraduationCapIcon size={12} />
                      ) : (
                        <StethoscopeIcon size={12} />
                      )}
                      <span>{p.specialty}</span>
                    </div>
                  </div>
                </div>
                {p.student && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                    Student
                  </span>
                )}
              </div>

              <div className="mb-4 flex items-center gap-1 text-sm">
                <MapPinIcon size={14} className="text-slate-400" />
                <span className="text-slate-500">{p.location}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center gap-1.5">
                  <StarIcon size={15} className="fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium text-slate-900">
                    {p.rating}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({p.reviews} reviews)
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    p.student ? "text-amber-600" : "text-teal-600"
                  }`}
                >
                  {p.fee}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-teal-200 hover:text-teal-600">
            View All Providers &rarr;
          </button>
        </div>
      </div>
    </section>
  );
}
