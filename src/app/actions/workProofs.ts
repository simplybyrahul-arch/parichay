"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

type ActionResult = {
    success: boolean;
    message: string;
};

type UploadResult = ActionResult & {
    proofUrl?: string;
};

type ProjectRow = {
    id: string;
    creator_id: string | null;
    selected_creator_id: string | null;
    parichay_coordinator_id: string | null;
    status: string | null;
};

const workProofBucket = "work-proofs";
const maxProofFileSize = 10 * 1024 * 1024;
const allowedProofFileTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/zip",
]);
const allowedProjectStatuses = new Set(["confirmed", "in_progress", "delivered"]);

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not configured`);
    return value;
}

function createAdminClient() {
    return createSupabaseAdminClient(
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

async function getActor() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, accountType: null, error: "Unauthorized." };

    const admin = createAdminClient();
    const { data: profile } = await admin
        .from("users")
        .select("account_type")
        .eq("id", user.id)
        .single();

    return {
        userId: user.id,
        accountType: String(profile?.account_type || ""),
        error: null,
    };
}

async function getProject(admin: ReturnType<typeof createAdminClient>, projectId: string) {
    const { data: project, error } = await admin
        .from("projects")
        .select("id, creator_id, selected_creator_id, parichay_coordinator_id, status")
        .eq("id", projectId)
        .single();

    if (error || !project) return null;
    return project as ProjectRow;
}

function canUploadWorkProof(actor: { userId: string; accountType: string | null }, project: ProjectRow) {
    return actor.accountType === "admin"
        || project.creator_id === actor.userId
        || project.selected_creator_id === actor.userId
        || project.parichay_coordinator_id === actor.userId;
}

async function ensureWorkProofBucket(admin: ReturnType<typeof createAdminClient>) {
    const { data: buckets, error: listError } = await admin.storage.listBuckets();
    if (listError) throw new Error("Could not access work proof storage.");

    const exists = buckets?.some((bucket) => bucket.name === workProofBucket);
    if (exists) return;

    const { error } = await admin.storage.createBucket(workProofBucket, {
        public: true,
        fileSizeLimit: maxProofFileSize,
        allowedMimeTypes: Array.from(allowedProofFileTypes),
    });

    if (error) throw new Error(error.message);
}

export async function uploadWorkProofFile(projectId: string, formData: FormData): Promise<UploadResult> {
    const actor = await getActor();
    if (!actor.userId) return { success: false, message: actor.error || "Unauthorized." };

    const file = formData.get("proof");
    if (!(file instanceof File)) {
        return { success: false, message: "Please choose a screenshot, PDF, or ZIP file." };
    }

    if (!allowedProofFileTypes.has(file.type)) {
        return { success: false, message: "Upload a PNG, JPG, WebP, PDF, or ZIP file." };
    }

    if (file.size > maxProofFileSize) {
        return { success: false, message: "Proof file must be 10 MB or smaller." };
    }

    const admin = createAdminClient();
    const project = await getProject(admin, projectId);
    if (!project) return { success: false, message: "Project not found." };
    if (!canUploadWorkProof({ userId: actor.userId, accountType: actor.accountType }, project)) {
        return { success: false, message: "Only the assigned creator or ShotcutCrew team can upload work proof." };
    }
    if (!allowedProjectStatuses.has(String(project.status))) {
        return { success: false, message: "Proof of work can be uploaded only after the booking is confirmed." };
    }

    await ensureWorkProofBucket(admin);

    const extension = file.name.split(".").pop()?.toLowerCase() || "proof";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "proof";
    const path = `${project.id}/${actor.userId}-${Date.now()}.${safeExtension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await admin.storage
        .from(workProofBucket)
        .upload(path, bytes, {
            contentType: file.type,
            upsert: false,
        });

    if (error) return { success: false, message: error.message };

    const { data } = admin.storage.from(workProofBucket).getPublicUrl(path);
    return {
        success: true,
        message: "Proof file uploaded.",
        proofUrl: data.publicUrl,
    };
}
