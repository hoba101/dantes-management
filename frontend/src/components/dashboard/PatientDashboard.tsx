"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { Calendar, Clock, AlertCircle } from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_name: string;
  provider: {
    name: string;
    role: string;
  };
}

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await api.get("/appointments");
        setAppointments(data.appointments || []);
      } catch (err: any) {
        setError(err.message || "Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading appointments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">My Booked Appointments</h2>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {appointments.length === 0 && !error ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-200">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg">No appointments found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="font-bold text-lg text-slate-900">Dr. {apt.provider.name}</span>
                <span className="text-sm text-slate-500 capitalize">{apt.provider.role} &bull; {apt.service_name || "General Checkup"}</span>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex flex-col text-sm text-slate-600">
                  <div className="flex items-center gap-1.5"><Calendar size={14} /> {format(new Date(apt.appointment_date), "MMM d, yyyy")}</div>
                  <div className="flex items-center gap-1.5"><Clock size={14} /> {apt.appointment_time}</div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(apt.status)}`}>
                  {apt.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
