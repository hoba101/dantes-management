"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { AlertIcon } from "@/components/icons";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    role: "patient",
    fullNameAr: "",
    fullNameEn: "",
    gender: "male",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api.post("/auth/register", formData);
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Create an account</h2>
            <p className="mt-2 text-sm text-slate-600">
              Or{" "}
              <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500">
                sign in to your existing account
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertIcon size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-4 rounded-md shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700" htmlFor="fullNameEn">Full Name (English)</label>
                  <input
                    id="fullNameEn" name="fullNameEn" type="text" required
                    value={formData.fullNameEn} onChange={handleChange}
                    className="mt-1 relative block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700" htmlFor="fullNameAr">Full Name (Arabic)</label>
                  <input
                    id="fullNameAr" name="fullNameAr" type="text" required
                    value={formData.fullNameAr} onChange={handleChange}
                    className="mt-1 relative block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="email">Email address</label>
                <input
                  id="email" name="email" type="email" required
                  value={formData.email} onChange={handleChange}
                  className="mt-1 relative block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="phone">Phone Number</label>
                <input
                  id="phone" name="phone" type="text" required
                  value={formData.phone} onChange={handleChange}
                  className="mt-1 relative block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
                <input
                  id="password" name="password" type="password" required minLength={8}
                  value={formData.password} onChange={handleChange}
                  className="mt-1 relative block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700" htmlFor="role">Role</label>
                  <select
                    id="role" name="role"
                    value={formData.role} onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="student">Student</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700" htmlFor="gender">Gender</label>
                  <select
                    id="gender" name="gender"
                    value={formData.gender} onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-70"
              >
                {loading ? "Registering..." : "Create account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
