"use client";

import { useState, useTransition } from "react";
import { FileCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { addProjectUpdate } from "@/app/actions/projectUpdates";
import { uploadWorkProofFile } from "@/app/actions/workProofs";

type Props = {
    projectId: string;
    projectStatus: string;
    canUpload: boolean;
};

const closedStatuses = new Set(["cancelled", "expired", "disputed", "completed"]);

export function WorkProofUpload({ projectId, projectStatus, canUpload }: Props) {
    const [proofUrl, setProofUrl] = useState("");
    const [proofFileName, setProofFileName] = useState("");
    const [note, setNote] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isPending, startTransition] = useTransition();

    const canSubmit = canUpload && !closedStatuses.has(projectStatus) && Boolean(proofUrl);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("proof", file);
        setIsUploading(true);

        try {
            const result = await uploadWorkProofFile(projectId, formData);
            if (!result.success || !result.proofUrl) throw new Error(result.message);
            setProofUrl(result.proofUrl);
            setProofFileName(file.name);
            toast.success(result.message);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not upload proof file.");
        } finally {
            setIsUploading(false);
            event.target.value = "";
        }
    };

    const submitProof = () => {
        if (!proofUrl) return;

        startTransition(async () => {
            const messageParts = [
                note.trim(),
                `Proof file: ${proofUrl}`,
            ].filter(Boolean);
            const result = await addProjectUpdate(
                projectId,
                "Proof of work submitted",
                messageParts.join("\n\n"),
                "delivered"
            );

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            setProofUrl("");
            setProofFileName("");
            setNote("");
        });
    };

    return (
        <section className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 text-green-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-stone-900 font-display">Proof of Work</h2>
                    <p className="text-sm text-stone-500 mt-1">Upload a screenshot, PDF, or ZIP file after completing the assigned work.</p>
                </div>
            </div>

            {canUpload && !closedStatuses.has(projectStatus) ? (
                <div className="rounded-2xl border border-green-100 bg-green-50 p-4 space-y-4">
                    <label className="block">
                        <span className="text-sm font-bold text-stone-700">Upload proof file</span>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,application/pdf,application/zip,.zip"
                            onChange={handleFileChange}
                            disabled={isUploading || isPending}
                            className="mt-2 block w-full text-sm text-stone-600 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-stone-700 hover:file:bg-stone-50 disabled:opacity-60"
                        />
                        <span className="mt-2 block text-xs font-semibold text-stone-500">
                            {isUploading ? "Uploading proof..." : proofFileName || "PNG, JPG, WebP, PDF, or ZIP up to 10 MB."}
                        </span>
                    </label>

                    {proofUrl && (
                        <a href={proofUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-bold text-green-700 hover:text-green-800">
                            View uploaded proof
                        </a>
                    )}

                    <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 resize-none"
                        placeholder="Add a short note about what was delivered..."
                    />

                    <button
                        onClick={submitProof}
                        disabled={!canSubmit || isUploading || isPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Upload className="w-4 h-4" />
                        {isPending ? "Submitting..." : "Submit Proof of Work"}
                    </button>
                </div>
            ) : (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-600">
                    Proof upload opens after you are selected and the booking is confirmed.
                </div>
            )}
        </section>
    );
}
