"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface BookingWidgetProps {
  providerId: string;
  role: "doctor" | "student";
  fee?: string;
}

export default function BookingWidget({ providerId, role, fee }: BookingWidgetProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Hardcoded for MVP, can be fetched dynamically from backend availability
  const availableTimes = [
    "09:00", "10:30", "13:00", "14:30", "16:00"
  ];

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      setError("Please select both a date and time.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const formattedTime = selectedTime + ":00"; // Backend expects HH:MM:SS or HH:MM
      
      await api.post("/appointments", {
        providerId,
        appointmentDate: formattedDate,
        appointmentTime: formattedTime,
      });

      setSuccess(true);
      // Optional: router.push('/dashboard') after short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to book appointment.");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden text-center py-12 px-6">
        <CheckCircle2 className="w-16 h-16 text-teal-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h3>
        <p className="text-slate-600">Your appointment has been successfully requested. Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
      <div className="p-6 bg-gradient-to-br from-teal-600 to-teal-700 text-white">
        <h3 className="text-xl font-bold mb-1">Book an Appointment</h3>
        <p className="text-teal-100 text-sm">
          {role === "doctor" 
            ? `Consultation: EGP ${fee || "0"}` 
            : "Free Student Treatment"}
        </p>
      </div>
      
      <div className="p-6">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-6">
          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            Select Date
          </h4>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              setError(""); // Clear error on change
            }}
            minDate={tomorrow} // Backend requires appointmentDate to be at least tomorrow
            inline
            calendarClassName="w-full border-none shadow-sm font-sans"
          />
        </div>

        <div className="mb-8">
          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Available Times
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {availableTimes.map((time) => (
              <button
                key={time}
                onClick={() => {
                  setSelectedTime(time);
                  setError(""); // Clear error on change
                }}
                className={`px-2 py-2 rounded-lg text-sm border text-center transition-all ${
                  selectedTime === time
                    ? "bg-teal-600 text-white border-teal-600 font-semibold"
                    : "border-slate-200 text-slate-700 hover:border-teal-600 hover:text-teal-600"
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleBooking}
          disabled={loading || !selectedDate || !selectedTime}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-600/20 transition-all hover:-translate-y-0.5"
        >
          {loading ? "Confirming..." : "Confirm Booking"}
        </button>
        
        <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> No credit card required to book
        </p>
      </div>
    </div>
  );
}
