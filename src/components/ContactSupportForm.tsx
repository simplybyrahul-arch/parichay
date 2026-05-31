"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const supportEmail = "rahul@shotcutcrew.com";

export function ContactSupportForm() {
  const [topic, setTopic] = useState("General inquiry");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trackEvent("contact_form_submitted", { topic });

    const subject = encodeURIComponent(`ShotcutCrew Support: ${topic}`);
    const body = encodeURIComponent(message.trim());
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-orange-100 bg-orange-50/60 p-6">
      <h2 className="text-2xl font-black text-stone-950">Send a quick support request</h2>
      <p className="mt-2 text-sm font-medium text-stone-600">
        This opens your email app. Do not include passwords, card details, or private payment information.
      </p>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-stone-700">Topic</span>
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 font-semibold text-stone-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          >
            <option>General inquiry</option>
            <option>Booking support</option>
            <option>Equipment rental support</option>
            <option>Payment support</option>
            <option>Creator or vendor account</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-stone-700">Message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            placeholder="Briefly describe what you need help with."
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 font-semibold text-stone-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </label>
      </div>
      <button
        type="submit"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 font-black text-white hover:bg-orange-700"
      >
        Open email draft
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
