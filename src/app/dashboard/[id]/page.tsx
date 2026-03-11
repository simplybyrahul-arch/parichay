"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Briefcase, CreditCard, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type ProjectRecord = {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  creator_id: string | null;
  creator_name: string | null;
  creator_role: string | null;
};

type PaymentRecord = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  razorpay_payment_id: string | null;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    const run = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, title, description, budget, status, created_at, start_date, end_date, creator_id")
        .eq("id", params.id)
        .eq("client_id", user.id)
        .single();

      if (projectError || !projectData) {
        setProject(null);
        setLoading(false);
        return;
      }

      let creatorName: string | null = null;
      let creatorRole: string | null = null;

      if (projectData.creator_id) {
        const { data: creatorData } = await supabase
          .from("creators")
          .select("role, users ( full_name )")
          .eq("id", projectData.creator_id)
          .single();

        const creatorUser = Array.isArray(creatorData?.users) ? creatorData.users[0] : creatorData?.users;
        creatorName = (creatorUser as { full_name?: string } | undefined)?.full_name || "Assigned Creator";
        creatorRole = (creatorData as { role?: string } | undefined)?.role || "Creator";
      }

      setProject({
        ...projectData,
        creator_name: creatorName,
        creator_role: creatorRole,
      });

      const { data: paymentData } = await supabase
        .from("payments")
        .select("id, amount, status, created_at, razorpay_payment_id")
        .eq("project_id", projectData.id)
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      setPayments(paymentData || []);
      setLoading(false);
    };

    run();
  }, [params.id, router, supabase]);

  const totalPaid = useMemo(
    () => payments.filter((p) => p.status === "captured").reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fdfbfb] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-[#fdfbfb] flex items-center justify-center px-6">
        <div className="max-w-xl w-full bg-white border border-stone-200 rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-black text-stone-900 font-display mb-2">Project not found</h1>
          <p className="text-stone-500 mb-6">This project does not exist or you do not have permission to view it.</p>
          <button onClick={() => router.push("/dashboard")} className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fdfbfb] px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-stone-900 font-display mb-2">{project.title}</h1>
              <p className="text-stone-600">{project.description}</p>
            </div>
            <div className="text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-stone-100 text-stone-700">
              {project.status}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50">
              <div className="text-xs text-stone-500 font-semibold mb-1">Budget</div>
              <div className="text-xl font-black text-stone-900">₹{project.budget.toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50">
              <div className="text-xs text-stone-500 font-semibold mb-1">Created On</div>
              <div className="text-xl font-black text-stone-900">{new Date(project.created_at).toLocaleDateString()}</div>
            </div>
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50">
              <div className="text-xs text-stone-500 font-semibold mb-1">Total Captured</div>
              <div className="text-xl font-black text-stone-900">₹{(totalPaid / 100).toLocaleString()}</div>
            </div>
          </div>

          {project.creator_id && (
            <div className="mt-8 p-5 border border-stone-200 rounded-2xl bg-white">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Assigned Creator</div>
              <div className="text-lg font-bold text-stone-900">{project.creator_name}</div>
              <div className="text-sm text-stone-500">{project.creator_role}</div>
            </div>
          )}
        </section>

        <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-black text-stone-900 font-display mb-4 inline-flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-orange-600" /> Payments
          </h2>

          {payments.length === 0 ? (
            <p className="text-stone-500">No payment records yet for this project.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 rounded-2xl border border-stone-200 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-stone-900">₹{(payment.amount / 100).toLocaleString()}</div>
                    <div className="text-xs text-stone-500">{new Date(payment.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-wide text-stone-700">{payment.status}</div>
                    <div className="text-xs text-stone-500">{payment.razorpay_payment_id || "Pending ID"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-xs text-stone-500 inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Escrow and payment records are fetched from your live database.
          </div>
        </section>

        <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-black text-stone-900 font-display mb-3 inline-flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-orange-600" /> Timeline
          </h2>
          <p className="text-stone-500">Milestones and chat are not in the current schema yet. This section now avoids any mock content until those tables are added.</p>
        </section>
      </div>
    </main>
  );
}
