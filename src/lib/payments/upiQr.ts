export type UpiQrProject = {
    id: string;
    budget: number | null;
};

export type ProjectUpiPaymentPayload = {
    qrPayload: string;
    amount: number;
    amountPaise: number;
    payeeName: string;
    upiId: string;
    transactionNote: string;
};

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not configured`);
    return value;
}

export function createProjectUpiPaymentPayload(project: UpiQrProject): ProjectUpiPaymentPayload {
    const upiId = getRequiredEnv("OWNER_UPI_ID");
    const payeeName = getRequiredEnv("OWNER_ACCOUNT_NAME");
    const amount = Number(project.budget || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Project amount is invalid for QR payment.");
    }

    const transactionNote = `ShotcutCrew Project ${project.id}`;
    const params = new URLSearchParams({
        pa: upiId,
        pn: payeeName,
        am: amount.toFixed(2),
        cu: "INR",
        tn: transactionNote,
    });

    return {
        qrPayload: `upi://pay?${params.toString()}`,
        amount,
        amountPaise: Math.round(amount * 100),
        payeeName,
        upiId,
        transactionNote,
    };
}
