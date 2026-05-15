"use client";

import { QRCodeSVG } from "qrcode.react";

type Props = {
    qrPayload: string;
    amount: number;
    upiId: string;
    payeeName: string;
    transactionNote: string;
};

export function UpiPaymentQr({ qrPayload, amount, upiId, payeeName, transactionNote }: Props) {
    return (
        <div className="grid md:grid-cols-[auto,1fr] gap-5 items-center">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 inline-flex justify-center">
                <QRCodeSVG value={qrPayload} size={220} level="M" includeMargin />
            </div>
            <div className="space-y-3 text-sm">
                <PaymentLine label="Amount" value={`Rs ${amount.toLocaleString("en-IN")}`} />
                <PaymentLine label="UPI ID" value={upiId} />
                <PaymentLine label="Payee" value={payeeName} />
                <PaymentLine label="Transaction Note" value={transactionNote} />
                <p className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-orange-800 font-semibold">
                    Scan this QR and pay. After payment, enter UTR/reference number below.
                </p>
                <a
                    href={qrPayload}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700 transition-colors"
                >
                    Pay with UPI app
                </a>
            </div>
        </div>
    );
}

function PaymentLine({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</div>
            <div className="font-bold text-stone-900 break-words">{value}</div>
        </div>
    );
}
