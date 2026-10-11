"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, MapPinIcon, StethoscopeIcon } from "@/components/icons";

export default function HeroSection() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [service, setService] = useState("");

  function handleSearch(loc?: string, svc?: string) {
    const params = new URLSearchParams();
    const l = loc ?? location;
    const s = svc ?? service;
    if (l.trim()) params.set("location", l.trim());
    if (s.trim()) params.set("service", s.trim());
    router.push(`/search${params.toString() ? "?" + params.toString() : ""}`);
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white pb-16 pt-12 sm:pb-24 sm:pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-medium text-teal-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
            </span>
            Connecting patients with top dental professionals
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Premium Dental Care &{" "}
            <span className="text-teal-600">University Cases</span>,
            All in One Place
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-slate-500 sm:mt-6 sm:text-xl">
            Find experienced dentists for quality care or connect with
            supervised university students for affordable treatment. Your smile,
            our mission.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl sm:mt-12">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 sm:py-2.5">
              <MapPinIcon size={18} className="shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Location (e.g., Cairo)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>

            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 sm:py-2.5">
              <StethoscopeIcon size={18} className="shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Service (e.g., Root Canal)"
                value={service}
                onChange={(e) => setService(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>

            <button
              onClick={() => handleSearch()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-teal-700 active:scale-[0.98] sm:py-2.5"
            >
              <SearchIcon size={18} />
              Search
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>Popular:</span>
            {["Teeth Cleaning", "Root Canal", "Braces", "Checkup"].map(
              (term) => (
                <button
                  key={term}
                  onClick={() => handleSearch("", term)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 transition-colors hover:border-teal-200 hover:text-teal-600"
                >
                  {term}
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
