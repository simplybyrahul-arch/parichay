import { Header } from "@/components/Header";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#fffcf8] pt-28 px-6 pb-20">
      <Header />
      <div className="max-w-4xl mx-auto bg-white border border-stone-200 rounded-3xl p-10">
        <h1 className="text-4xl font-black font-display text-stone-900 mb-4">Pricing</h1>
        <p className="text-stone-600 leading-relaxed">
          Pricing varies by creator role, project scope, and milestone structure. Use booking modes to get live estimates.
        </p>
      </div>
    </main>
  );
}
