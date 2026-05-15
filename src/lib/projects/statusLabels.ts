const openSelectionStatuses = new Set([
  "open",
  "matching",
  "receiving_interest",
  "client_selecting",
]);

const paymentStatusLabels: Record<string, string> = {
  pending_payment: "Payment pending",
  qr_pending: "QR payment pending",
  proof_uploaded: "Payment proof submitted",
  coordinator_verified: "Coordinator verified",
  payment_received: "Payment received",
  paid: "Paid",
  escrowed: "Payment received",
  released: "Released",
  refunded: "Refunded",
  disputed: "Disputed",
  rejected: "Payment proof rejected",
};

function toTitleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function formatPaymentStatus(
  paymentStatus: string | null | undefined,
  projectStatus: string | null | undefined,
  selectedCreatorId: string | null | undefined
) {
  const status = paymentStatus || "not_required";

  if (status === "not_required") {
    if (!selectedCreatorId && projectStatus && openSelectionStatuses.has(projectStatus)) {
      return "Payment after creator selection";
    }

    return "Payment not required yet";
  }

  return paymentStatusLabels[status] || toTitleCase(status);
}
