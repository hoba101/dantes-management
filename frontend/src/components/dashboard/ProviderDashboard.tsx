"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { Calendar, Clock, AlertCircle, Plus, Trash2 } from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_name: string;
  patient: {
    name: string;
  };
}

interface Service {
  price_id: string;
  service_id: string;
  name_en: string;
  category: string;
  price: string;
}

interface CatalogItem {
  id: string;
  name_en: string;
  category: string;
}

export default function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState<"appointments" | "services">("appointments");
  
  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  
  // Services State
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [error, setError] = useState("");

  // New Service Form
  const [newServiceId, setNewServiceId] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const fetchAppointments = async () => {
    try {
      const data = await api.get("/appointments");
      setAppointments(data.appointments || []);
    } catch (err: any) {
      setError(err.message || "Failed to load appointments");
    } finally {
      setLoadingAppts(false);
    }
  };

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const [myData, catalogData] = await Promise.all([
        api.get("/services/my"),
        api.get("/services/catalog"),
      ]);
      setMyServices(myData.services || []);
      setCatalog(catalogData.services || []);
    } catch (err: any) {
      setError(err.message || "Failed to load services");
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    if (activeTab === "appointments") {
      fetchAppointments();
    } else {
      fetchServices();
    }
  }, [activeTab]);

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceId || !newPrice) return;

    try {
      await api.post("/services", { serviceId: newServiceId, price: Number(newPrice) });
      setNewServiceId("");
      setNewPrice("");
      fetchServices(); // Refresh list
    } catch (err: any) {
      alert(err.message || "Failed to add service");
    }
  };

  const removeService = async (priceId: string) => {
    try {
      await api.delete(`/services/${priceId}`);
      setMyServices(prev => prev.filter(s => s.price_id !== priceId));
    } catch (err: any) {
      alert(err.message || "Failed to remove service");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("appointments")}
          className={`pb-4 px-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "appointments" ? "border-teal-600 text-teal-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Incoming Appointments
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`pb-4 px-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "services" ? "border-teal-600 text-teal-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Manage Services
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="space-y-4">
          {loadingAppts ? (
            <div className="text-slate-500 text-center py-8">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="text-slate-500 text-center py-8 border rounded-xl border-dashed">No incoming appointments.</div>
          ) : (
            appointments.map((apt) => (
              <div key={apt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-slate-900">{apt.patient.name}</span>
                  <span className="text-sm text-slate-500">{apt.service_name || "General"}</span>
                </div>
                
                <div className="flex flex-col text-sm text-slate-600">
                  <div className="flex items-center gap-1.5"><Calendar size={14} /> {format(new Date(apt.appointment_date), "MMM d, yyyy")}</div>
                  <div className="flex items-center gap-1.5"><Clock size={14} /> {apt.appointment_time}</div>
                </div>

                <div className="flex items-center gap-2">
                  {apt.status === "pending" ? (
                    <>
                      <button onClick={() => updateAppointmentStatus(apt.id, "confirmed")} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => updateAppointmentStatus(apt.id, "cancelled")} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold rounded-lg transition-colors">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold uppercase rounded-full">
                      {apt.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "services" && (
        <div className="grid gap-8 md:grid-cols-2">
          {/* Add Service Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Service</h3>
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Service</label>
                <select
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose from Catalog --</option>
                  {catalog.map(c => (
                    <option key={c.id} value={c.id}>{c.category} - {c.name_en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (EGP)</label>
                <input
                  type="number"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
                />
              </div>
              <button type="submit" className="w-full flex justify-center items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg transition-colors">
                <Plus size={18} /> Add Service
              </button>
            </form>
          </div>

          {/* Current Services */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">My Offered Services</h3>
            {loadingServices ? (
              <div className="text-slate-500">Loading services...</div>
            ) : myServices.length === 0 ? (
              <div className="text-slate-500 italic">No services added yet.</div>
            ) : (
              <div className="space-y-3">
                {myServices.map(svc => (
                  <div key={svc.price_id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-semibold text-slate-800">{svc.name_en}</div>
                      <div className="text-sm text-teal-600 font-bold">EGP {svc.price}</div>
                    </div>
                    <button onClick={() => removeService(svc.price_id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
