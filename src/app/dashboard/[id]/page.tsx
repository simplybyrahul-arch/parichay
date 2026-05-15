"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, CheckCircle, CreditCard, MapPin, ShieldCheck, Star, Wallet } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import {
  getClientProjectSelectionDetail,
  selectCreator,
  shortlistCreator,
  type ClientProjectSelectionDetail,
  type InterestedCreator,
} from "@/app/actions/clientSelection";
import { listProjectDisputes, type ProjectDispute } from "@/app/actions/disputes";
import {
  getProjectQrPayment,
  submitQrPaymentProof,
  uploadQrPaymentProofFile,
  type ProjectQrPaymentDetails,
} from "@/app/actions/qrPayments";
import { DisputeForm } from "./DisputeForm";
import { UpiPaymentQr } from "@/components/payments/UpiPaymentQr";
import { formatPaymentStatus } from "@/lib/projects/statusLabels";
import { CancelBookingButton } from "@/components/projects/CancelBookingButton";
import { isClientProjectCancellable } from "@/lib/projects/status";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";

type PaymentRecord = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  razorpay_payment_id: string | null;
};

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    description?: string;
  };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => Promise<void>;
  prefill: {
    name: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
};

type RazorpayInstance = {
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
  open: () => void;
};

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

type WindowWithRazorpay = Window & {
  Razorpay?: RazorpayConstructor;
};

const selectionLockedStatuses = new Set(["pending_payment", "confirmed", "in_progress", "completed", "cancelled", "expired", "disputed"]);

function formatCurrency(value: number | null | undefined) {
  if (!value) return "Not specified";
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not specified";
  return new Date(value).toLocaleDateString();
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClientProjectSelectionDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [disputes, setDisputes] = useState<ProjectDispute[]>([]);
  const [qrPayment, setQrPayment] = useState<ProjectQrPaymentDetails | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentProofFileName, setPaymentProofFileName] = useState("");
  const [actionInviteId, setActionInviteId] = useState<string | null>(null);
  const [isPayingAdvance, setIsPayingAdvance] = useState(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const project = detail?.project || null;
  const interestedCreators = detail?.interested_creators || [];
  const selectedCreator = detail?.selected_creator || null;

  const loadProjectDetail = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const result = await getClientProjectSelectionDetail(params.id);
      if (!result.success || !result.detail) {
        setDetail(null);
        setLoading(false);
        return;
      }

      setDetail(result.detail);
      const projectStatus = result.detail.project.status;
      if (["confirmed", "in_progress", "delivered"].includes(projectStatus)) {
        const qrResult = await getProjectQrPayment(result.detail.project.id);
        if (qrResult.success && qrResult.payment) {
          setQrPayment(qrResult.payment);
          setPaymentReference(qrResult.payment.payment_reference || "");
          setPaymentProofUrl(qrResult.payment.payment_proof_url || "");
          setPaymentProofFileName(qrResult.payment.payment_proof_url ? "Payment proof uploaded" : "");
        } else {
          setQrPayment(null);
        }
      } else {
        setQrPayment(null);
      }

      const { data: paymentData } = await supabase
        .from("payments")
        .select("id, amount, status, created_at, razorpay_payment_id")
        .eq("project_id", result.detail.project.id)
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      setPayments(paymentData || []);
      setDisputes(await listProjectDisputes(result.detail.project.id));
    } catch (error) {
      console.error("Project detail load error:", error);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router, supabase]);

  const totalPaid = useMemo(
    () => payments.filter((p) => ["captured", "paid"].includes(p.status)).reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  const selectionLocked = Boolean(
    project?.selected_creator_id ||
    (project && selectionLockedStatuses.has(project.status))
  );
  const isExpired = project?.status === "expired";
  const isCancelled = project?.status === "cancelled";
  const latestDispute = disputes[0] || null;
  const disputeWindowOpen = Boolean(project?.status === "delivered" && project.delivered_at && Date.now() - new Date(project.delivered_at).getTime() <= 48 * 60 * 60 * 1000);
  const disputeWindowClosed = Boolean(project?.status === "delivered" && project.delivered_at && Date.now() - new Date(project.delivered_at).getTime() > 48 * 60 * 60 * 1000);

  const handleShortlist = async (inviteId: string) => {
    if (!project) return;
    setActionInviteId(inviteId);
    try {
      const result = await shortlistCreator(project.id, inviteId);
      if (!result.success) throw new Error(result.message);
      toast.success(result.message);
      await loadProjectDetail();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not shortlist creator.");
    } finally {
      setActionInviteId(null);
    }
  };

  const handleSelect = async (inviteId: string) => {
    if (!project) return;
    setActionInviteId(inviteId);
    try {
      const result = await selectCreator(project.id, inviteId);
      if (!result.success) throw new Error(result.message);
      toast.success(result.message);
      await loadProjectDetail();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not select creator.");
    } finally {
      setActionInviteId(null);
    }
  };

  const handlePayAdvance = async () => {
    if (!project) return;
    setIsPayingAdvance(true);
    const toastId = toast.loading("Creating advance payment order...");

    try {
      const orderRes = await fetch("/api/payments/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create advance payment order.");
      }

      const razorpay = (window as WindowWithRazorpay).Razorpay;
      if (!razorpay) {
        throw new Error("Payment gateway is not available right now.");
      }

      const checkout = new razorpay({
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ShotcutCrew",
        description: `Advance payment for ${project.title}`,
        order_id: orderData.order_id,
        prefill: {
          name: "Client",
        },
        theme: {
          color: "#ea580c",
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment was cancelled.", { id: toastId });
            setIsPayingAdvance(false);
          },
        },
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            toast.loading("Verifying advance payment...", { id: toastId });

            const verifyRes = await fetch("/api/payments/verify-advance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId: project.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            toast.success("Payment received. Booking confirmed.", { id: toastId });
            await loadProjectDetail();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Payment verification failed.", { id: toastId });
          } finally {
            setIsPayingAdvance(false);
          }
        },
      });

      checkout.on("payment.failed", (response: RazorpayFailureResponse) => {
        toast.error(response.error?.description || "Payment failed. Please try again.", { id: toastId });
        setIsPayingAdvance(false);
      });

      checkout.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.", { id: toastId });
      setIsPayingAdvance(false);
    }
  };

  const handleSubmitQrProof = async () => {
    if (!project) return;
    setIsSubmittingProof(true);
    try {
      const result = await submitQrPaymentProof(project.id, paymentReference, paymentProofUrl);
      if (!result.success) throw new Error(result.message);
      toast.success(result.message);
      await loadProjectDetail();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit payment proof.");
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleProofFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!project) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("proof", file);
    setIsUploadingProof(true);

    try {
      const result = await uploadQrPaymentProofFile(project.id, formData);
      if (!result.success || !result.proofUrl) throw new Error(result.message);
      setPaymentProofUrl(result.proofUrl);
      setPaymentProofFileName(file.name);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload payment screenshot.");
      event.target.value = "";
    } finally {
      setIsUploadingProof(false);
    }
  };

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
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="max-w-5xl mx-auto space-y-6">
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

          {isExpired && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <div className="text-sm font-bold text-rose-800">This booking has expired because no creator was selected in time.</div>
              <button
                onClick={() => router.push("/book")}
                className="mt-4 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors"
              >
                Create similar booking again
              </button>
            </div>
          )}

          {isCancelled && (
            <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <div className="text-sm font-bold text-stone-800">This booking has been cancelled.</div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <InfoTile label="Budget" value={formatCurrency(project.budget)} />
            <InfoTile label="Payment Status" value={formatPaymentStatus(project.payment_status, project.status, project.selected_creator_id)} />
            <InfoTile label="Interested Creators" value={`${interestedCreators.length}`} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <InfoTile label="Booking Type" value={project.booking_type?.replace(/_/g, " ") || "Not specified"} />
            <InfoTile label="Location" value={project.booking_location || "Not specified"} />
            <InfoTile label="Event Date" value={formatDate(project.event_date)} />
            <InfoTile label="Estimated Days" value={project.estimated_days ? `${project.estimated_days}` : "Not specified"} />
          </div>

          {project.requirement_summary && (
            <div className="mt-6 p-5 border border-stone-200 rounded-2xl bg-stone-50">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Requirement Summary</div>
              <p className="text-sm text-stone-700 leading-relaxed">{project.requirement_summary}</p>
            </div>
          )}

          {selectedCreator && (
            <div className="mt-8 p-5 border border-stone-200 rounded-2xl bg-white">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Selected Creator</div>
              <div className="text-lg font-bold text-stone-900">{selectedCreator.name}</div>
              <div className="text-sm text-stone-500">
                {selectedCreator.role || "Creator"} · {selectedCreator.city || selectedCreator.location || "Location not specified"}
              </div>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 mt-4">
                Booking is confirmed. QR payment will be verified manually after payment proof is submitted.
              </p>
            </div>
          )}

          {project.parichay_assigned && (
            <div className="mt-6 p-5 border border-green-200 rounded-2xl bg-green-50">
              <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Parichay coordinator assigned</div>
              <div className="text-sm font-bold text-green-900">
                {project.parichay_coordinator_name || "A Parichay team member"}
              </div>
            </div>
          )}

          {isClientProjectCancellable(project.status, project.payment_status, project.selected_creator_id) && (
            <div className="mt-6">
              <CancelBookingButton projectId={project.id} onCancelled={loadProjectDetail} />
            </div>
          )}
        </section>

        {project.status === "pending_payment" && project.payment_status === "pending_payment" && project.selected_creator_id && (
          <section className="bg-white border border-orange-200 rounded-3xl p-8 shadow-sm">
            <h2 className="text-xl font-black text-stone-900 font-display mb-2 inline-flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" /> Complete advance payment
            </h2>
            <p className="text-stone-600 mb-6">Your selected creator will be confirmed after payment is completed.</p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-orange-50 border border-orange-100 p-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-orange-700 mb-1">Amount</div>
                <div className="text-2xl font-black text-stone-900">{formatCurrency(project.budget)}</div>
              </div>
              <button
                onClick={handlePayAdvance}
                disabled={isPayingAdvance}
                className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPayingAdvance ? "Opening Payment..." : "Pay Advance"}
              </button>
            </div>
          </section>
        )}

        {project.payment_status === "escrowed" && (
          <section className="bg-green-50 border border-green-200 rounded-3xl p-6 shadow-sm">
            <div className="inline-flex items-center gap-2 text-green-800 font-bold">
              <CheckCircle className="w-5 h-5" />
              Payment received. Booking confirmed.
            </div>
          </section>
        )}

        {qrPayment && ["confirmed", "in_progress", "delivered"].includes(project.status) && (
          <section className="bg-white border border-orange-200 rounded-3xl p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-black text-stone-900 font-display mb-2 inline-flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" /> QR Payment
              </h2>
              <p className="text-stone-600 text-sm">Pay to ShotcutCrew using this project-specific UPI QR, then submit your UTR/reference number.</p>
            </div>

            <UpiPaymentQr
              qrPayload={qrPayment.qrPayload}
              amount={qrPayment.amount}
              upiId={qrPayment.upiId}
              payeeName={qrPayment.payeeName}
              transactionNote={qrPayment.transactionNote}
            />

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">Payment Status</div>
              <div className="font-bold text-stone-900">
                {formatPaymentStatus(project.payment_status || qrPayment.payment_status, project.status, project.selected_creator_id)}
              </div>
              {project.payment_status === "proof_uploaded" && (
                <p className="text-sm text-orange-700 mt-2">Payment proof submitted. Waiting for coordinator/admin verification.</p>
              )}
              {project.payment_status === "rejected" && (
                <p className="text-sm text-rose-700 mt-2">Payment proof rejected. Please submit correct payment reference.</p>
              )}
              {qrPayment.verification_note && (
                <p className="text-sm text-stone-600 mt-2">Note: {qrPayment.verification_note}</p>
              )}
            </div>

            {!["payment_received", "paid"].includes(project.payment_status || "") && (
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-bold text-stone-700">UTR/reference number</span>
                  <input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                    placeholder="Enter UTR or payment reference"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-stone-700">Upload payment screenshot</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={handleProofFileChange}
                    disabled={isUploadingProof || isSubmittingProof}
                    className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-orange-700 hover:file:bg-orange-100 disabled:opacity-60"
                  />
                  <span className="mt-2 block text-xs text-stone-500">
                    {isUploadingProof ? "Uploading screenshot..." : paymentProofFileName || "PNG, JPG, WebP, or PDF up to 5 MB."}
                  </span>
                </label>
                <button
                  onClick={handleSubmitQrProof}
                  disabled={isSubmittingProof || isUploadingProof || !paymentReference.trim()}
                  className="md:col-span-2 px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingProof ? "Submitting..." : "Submit Payment Proof"}
                </button>
              </div>
            )}
          </section>
        )}

        {["payment_received", "paid"].includes(project.payment_status || "") && (
          <section className="bg-green-50 border border-green-200 rounded-3xl p-6 shadow-sm">
            <div className="inline-flex items-center gap-2 text-green-800 font-bold">
              <CheckCircle className="w-5 h-5" />
              Payment received. Project completed.
            </div>
          </section>
        )}

        {project.status === "disputed" && (
          <section className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-sm">
            <div className="text-rose-800 font-bold">This booking is under dispute review.</div>
            {latestDispute && (
              <p className="text-sm text-rose-700 mt-2">Status: {latestDispute.status}. Admin will review the case.</p>
            )}
          </section>
        )}

        {disputeWindowOpen && !latestDispute && (
          <DisputeForm projectId={project.id} onSuccess={loadProjectDetail} />
        )}

        {disputeWindowClosed && !latestDispute && (
          <section className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <div className="text-sm font-bold text-stone-700">Dispute window closed.</div>
          </section>
        )}

        {latestDispute && project.status !== "disputed" && (
          <section className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <div className="text-sm font-bold text-stone-900">Dispute status: {latestDispute.status}</div>
            {latestDispute.resolution_type && (
              <p className="text-sm text-stone-600 mt-2">Resolution: {latestDispute.resolution_type.replace(/_/g, " ")}</p>
            )}
          </section>
        )}

        <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-black text-stone-900 font-display mb-2 inline-flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-600" /> Interested Creators
              </h2>
              <p className="text-stone-500 text-sm">Compare creator responses, shortlist strong fits, and select one creator when ready.</p>
            </div>
            {selectionLocked && (
              <span className="text-xs font-bold uppercase tracking-wide text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full self-start md:self-auto">
                Selection locked
              </span>
            )}
          </div>

          {interestedCreators.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-stone-200 bg-stone-50">
              <p className="text-stone-600 font-semibold">{isExpired ? "Booking expired" : "No interested creators yet."}</p>
              <p className="text-sm text-stone-500 mt-1">
                {isExpired ? "Selection and payment actions are disabled for expired bookings." : "Creator responses will appear here once matched creators mark Interested."}
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {interestedCreators.map((creator) => (
                <CreatorComparisonCard
                  key={creator.invite_id}
                  creator={creator}
                  disabled={selectionLocked}
                  busy={actionInviteId === creator.invite_id}
                  onShortlist={() => handleShortlist(creator.invite_id)}
                  onSelect={() => handleSelect(creator.invite_id)}
                />
              ))}
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
                    <div className="font-bold text-stone-900">Rs {(payment.amount / 100).toLocaleString("en-IN")}</div>
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
            <ShieldCheck className="w-4 h-4" /> Payment records are fetched from your database. Vendor payout and settlement release are future workflow items.
          </div>
        </section>

        <ProjectTimeline
          projectId={project.id}
          projectStatus={project.status}
          canAdd={false}
          emptyMessage="No timeline updates yet. The selected creator will post work milestones here."
          onUpdated={loadProjectDetail}
        />

        <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
          <div className="text-sm text-stone-500">Total captured so far: Rs {(totalPaid / 100).toLocaleString("en-IN")}</div>
        </section>
      </div>
    </main>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50">
      <div className="text-xs text-stone-500 font-semibold mb-1">{label}</div>
      <div className="text-sm md:text-base font-black text-stone-900 break-words">{value}</div>
    </div>
  );
}

function CreatorComparisonCard({
  creator,
  disabled,
  busy,
  onShortlist,
  onSelect,
}: {
  creator: InterestedCreator;
  disabled: boolean;
  busy: boolean;
  onShortlist: () => void;
  onSelect: () => void;
}) {
  const canShortlist = !disabled && creator.invite_status === "interested";
  const canSelect = !disabled && ["interested", "shortlisted"].includes(creator.invite_status);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-stone-100 overflow-hidden flex items-center justify-center text-stone-500 font-black flex-shrink-0">
          {creator.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.profile_image_url} alt={creator.name} className="w-full h-full object-cover" />
          ) : (
            creator.name.charAt(0)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-black text-stone-900 truncate">{creator.name}</h3>
              <p className="text-sm text-stone-500">{creator.role || "Creator"}</p>
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-md ${creator.invite_status === "selected" ? "bg-green-50 text-green-700" : creator.invite_status === "shortlisted" ? "bg-orange-50 text-orange-700" : "bg-stone-100 text-stone-600"}`}>
              {creator.invite_status}
            </span>
          </div>
          {creator.verified && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" /> Verified
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
        <CreatorMeta icon={<MapPin className="w-4 h-4" />} label="Location" value={creator.city || creator.location || "Not specified"} />
        <CreatorMeta icon={<Wallet className="w-4 h-4" />} label="Day Rate" value={formatCurrency(creator.day_rate)} />
        <CreatorMeta icon={<Calendar className="w-4 h-4" />} label="Responded" value={formatDate(creator.responded_at)} />
        <CreatorMeta icon={<Star className="w-4 h-4" />} label="Match Score" value={creator.match_score !== null ? `${creator.match_score}` : "Not scored"} />
      </div>

      {creator.portfolio_url && (
        <a href={creator.portfolio_url} target="_blank" rel="noreferrer" className="mt-4 text-sm font-bold text-orange-600 hover:text-orange-700">
          View portfolio
        </a>
      )}

      <div className="space-y-3 mt-5 flex-1">
        {creator.response_note && (
          <NoteBlock label="Response Note" value={creator.response_note} />
        )}
        {creator.availability_note && (
          <NoteBlock label="Availability Note" value={creator.availability_note} />
        )}
        {creator.match_reason && (
          <NoteBlock label="Match Reason" value={creator.match_reason} />
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-5 mt-5 border-t border-stone-100">
        {creator.invite_status === "selected" ? (
          <div className="w-full py-2.5 rounded-xl bg-green-50 text-green-700 text-sm font-bold text-center">Selected</div>
        ) : (
          <>
            {creator.invite_status === "shortlisted" ? (
              <div className="flex-1 py-2.5 rounded-xl bg-orange-50 text-orange-700 text-sm font-bold text-center">Shortlisted</div>
            ) : (
              <button
                onClick={onShortlist}
                disabled={!canShortlist || busy}
                className="flex-1 py-2.5 bg-stone-50 text-stone-700 font-bold rounded-xl hover:bg-stone-100 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Saving..." : "Shortlist"}
              </button>
            )}
            <button
              onClick={onSelect}
              disabled={!canSelect || busy}
              className="flex-1 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Saving..." : "Select Creator"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CreatorMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-stone-400 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-stone-500">{label}</div>
        <div className="text-sm font-bold text-stone-900 break-words">{value}</div>
      </div>
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">{label}</div>
      <p className="text-sm text-stone-700 leading-relaxed">{value}</p>
    </div>
  );
}
