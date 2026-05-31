import { Header } from "@/components/Header";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with ShotcutCrew bookings, creator accounts, equipment rentals, payments, and platform policies.",
  alternates: {
    canonical: "/support",
  },
};

const supportTopics = [
  {
    title: "Bookings",
    description: "Questions about Quick Booking, custom projects, creator selection, or booking status.",
  },
  {
    title: "Equipment Rentals",
    description: "Help with rental requests, vendor quotes, delivery, pickup, operator support, or damage concerns.",
  },
  {
    title: "Payments",
    description: "Support for payment proof, verification, refunds, invoices, and payout-related questions.",
  },
  {
    title: "Accounts",
    description: "Assistance with client, creator, studio, equipment vendor, or admin access issues.",
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#fffcf8] pt-28 px-6 pb-20">
      <Header />
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-orange-100 bg-white p-8 shadow-sm md:p-12">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-600">
            ShotcutCrew Support
          </p>
          <h1 className="font-display text-4xl font-black text-stone-950 md:text-5xl">
            How can we help?
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-stone-600">
            For booking help, creator onboarding, equipment rental support, payments, or platform policy questions,
            contact the ShotcutCrew team.
          </p>
          <div className="mt-8 rounded-2xl bg-orange-50 p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-stone-500">Support email</p>
            <a
              href="mailto:rahul@shotcutcrew.com"
              className="mt-2 inline-block text-2xl font-black text-orange-600 hover:text-orange-700"
            >
              rahul@shotcutcrew.com
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {supportTopics.map((topic) => (
            <article key={topic.title} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-stone-950">{topic.title}</h2>
              <p className="mt-3 leading-relaxed text-stone-600">{topic.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-stone-950">Helpful links</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="rounded-full bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700" href="/book">
              Start a booking
            </Link>
            <Link className="rounded-full bg-stone-100 px-5 py-3 font-bold text-stone-800 hover:bg-stone-200" href="/refund-policy">
              Refund policy
            </Link>
            <Link className="rounded-full bg-stone-100 px-5 py-3 font-bold text-stone-800 hover:bg-stone-200" href="/terms">
              Terms
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
