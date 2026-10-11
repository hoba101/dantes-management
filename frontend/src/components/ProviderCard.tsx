import { StarIcon, MapPinIcon, StethoscopeIcon, GraduationCapIcon } from "@/components/icons";

export interface Provider {
  id: string;
  name: string;
  role: "doctor" | "student";
  specialty: string;
  initials: string;
  location: string;
  rating: number;
  reviewCount: number;
  price: number | null;
  priceLabel: string;
  isFree: boolean;
  photoUrl?: string;
  yearsExperience?: number;
  university?: string;
}

interface Props {
  provider: Provider;
}

export default function ProviderCard({ provider }: Props) {
  const p = provider;
  const isDoctor = p.role === "doctor";

  return (
    <div className="group flex flex-col rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-100/30">
      <div className="flex items-start gap-4 p-5 pb-0">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm ${
            isDoctor ? "bg-teal-600" : "bg-amber-500"
          }`}
        >
          {p.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {p.name}
              </h3>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                {isDoctor ? (
                  <StethoscopeIcon size={14} />
                ) : (
                  <GraduationCapIcon size={14} />
                )}
                <span>{p.specialty}</span>
              </div>
            </div>
            {!isDoctor && (
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                Student
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
            <MapPinIcon size={13} />
            <span>{p.location}</span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-3">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              size={14}
              className={
                star <= Math.round(p.rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-200"
              }
            />
          ))}
          <span className="ml-1 text-sm font-medium text-slate-900">
            {p.rating}
          </span>
          <span className="text-xs text-slate-400">
            ({p.reviewCount} reviews)
          </span>
        </div>

        {p.university && (
          <p className="mt-2 text-xs text-slate-400">
            {p.university}
          </p>
        )}
        {p.yearsExperience && (
          <p className="mt-2 text-xs text-slate-400">
            {p.yearsExperience} years experience
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 px-5 py-4">
        <div>
          {p.isFree ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Free — University Case
            </span>
          ) : (
            <span className="text-lg font-bold text-slate-900">
              {p.priceLabel}
            </span>
          )}
        </div>

        <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-teal-700 active:scale-[0.97]">
          Book Now
        </button>
      </div>
    </div>
  );
}
