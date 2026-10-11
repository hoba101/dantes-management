"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import ProviderCard from "@/components/ProviderCard";
import type { Provider } from "@/components/ProviderCard";
import { SearchIcon, FilterIcon, MapPinIcon, StethoscopeIcon, AlertIcon } from "@/components/icons";
import { api } from "@/lib/api";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
}

function transformResult(item: Record<string, unknown>): Provider {
  const isDoctor = item.role === "doctor";
  const services = (item.services as Record<string, unknown>[]) || [];
  const studentServices = (item.student_services as Record<string, unknown>[]) || [];
  const firstService = isDoctor ? services[0] : studentServices[0];
  const clinics = (item.clinics as Record<string, unknown>[]) || [];
  const firstClinic = clinics[0];

  const name = (item.full_name_en as string) || (item.full_name_ar as string) || "";
  const fee = item.consultation_fee as number | null;

  return {
    id: String(item.user_id),
    name,
    role: item.role as "doctor" | "student",
    specialty: (firstService?.name_en as string) || (firstService?.category as string) || "General Dentistry",
    initials: getInitials(name),
    location: (firstClinic?.name as string) || firstClinic?.address as string || "Egypt",
    rating: 0,
    reviewCount: 0,
    price: isDoctor ? fee : null,
    priceLabel: isDoctor ? `${fee} EGP` : "Free",
    isFree: !isDoctor,
    yearsExperience: isDoctor ? (item.years_of_experience as number) : undefined,
    university: !isDoctor ? (item.university as string) : undefined,
  };
}

function SearchContent() {
  const searchParams = useSearchParams();
  const locationParam = searchParams.get("location") || "";
  const serviceParam = searchParams.get("service") || "";

  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [locInput, setLocInput] = useState(locationParam);
  const [svcInput, setSvcInput] = useState(serviceParam);

  const fetchResults = useCallback(async (loc: string, svc: string) => {
    setLoading(true);
    setError("");

    const queryParts: string[] = [];
    if (loc.trim()) queryParts.push(loc.trim());
    if (svc.trim()) queryParts.push(svc.trim());
    const query = queryParts.join(" ");

    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("offset", "0");
      if (query) params.set("query", query);

      const data = await api.get(`/search?${params.toString()}`);
      const results: Record<string, unknown>[] = data.results || [];
      setProviders(results.map(transformResult));
      setTotal(data.pagination?.total ?? results.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch results");
      setProviders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(locationParam, serviceParam);
  }, [locationParam, serviceParam, fetchResults]);

  function handleSearch() {
    const params = new URLSearchParams();
    if (locInput.trim()) params.set("location", locInput.trim());
    if (svcInput.trim()) params.set("service", svcInput.trim());
    const qs = params.toString();
    window.history.replaceState(null, "", `/search${qs ? "?" + qs : ""}`);
    fetchResults(locInput, svcInput);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {locationParam || serviceParam
              ? `Showing results for${locationParam ? ` "${locationParam}"` : ""}${serviceParam ? ` — ${serviceParam}` : ""}`
              : "Browse all providers"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {loading ? "Searching..." : `${total} provider${total !== 1 ? "s" : ""} found`}
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <MapPinIcon size={16} className="shrink-0 text-slate-400" />
            <input
              type="text"
              value={locInput}
              onChange={(e) => setLocInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Location"
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <StethoscopeIcon size={16} className="shrink-0 text-slate-400" />
            <input
              type="text"
              value={svcInput}
              onChange={(e) => setSvcInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Service"
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-teal-700 active:scale-[0.98]"
          >
            <SearchIcon size={16} />
            Search
          </button>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50">
            <FilterIcon size={16} />
            Filters
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertIcon size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
          </div>
        ) : providers.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        ) : !error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <StethoscopeIcon size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-500">No providers found</p>
            <p className="mt-1 text-sm text-slate-400">Try adjusting your search criteria</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
