"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type PortfolioItem = {
    id: string;
    creator_id: string;
    media_url: string;
    media_type: "image" | "video";
    title: string | null;
    description: string | null;
    sort_order: number;
    is_public: boolean;
    created_at: string;
};

type ActionResult = {
    success: boolean;
    message: string;
};

const portfolioBucket = "creator-portfolio";
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const maxImageSize = 10 * 1024 * 1024;
const maxVideoSize = 100 * 1024 * 1024;

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

async function getCreatorId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { creatorId: null, error: "Unauthorized." };

    const admin = createAdminClient();
    const { data: creator } = await admin.from("creators").select("id").eq("id", user.id).single();
    if (!creator) return { creatorId: null, error: "Creator profile was not found." };

    return { creatorId: user.id, error: null };
}

function fileKind(file: File): "image" | "video" | null {
    if (imageTypes.has(file.type)) return "image";
    if (videoTypes.has(file.type)) return "video";
    return null;
}

function validateFile(file: File) {
    const kind = fileKind(file);
    if (!kind) return "Supported files: jpg, jpeg, png, webp, mp4, mov, webm.";
    if (kind === "image" && file.size > maxImageSize) return "Images must be 10MB or smaller.";
    if (kind === "video" && file.size > maxVideoSize) return "Videos must be 100MB or smaller.";
    return null;
}

async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
    const { data: buckets, error: listError } = await admin.storage.listBuckets();
    if (listError) throw new Error("Could not access storage.");
    if (buckets?.some((bucket) => bucket.name === portfolioBucket)) return;

    const { error } = await admin.storage.createBucket(portfolioBucket, {
        public: true,
        fileSizeLimit: maxVideoSize,
        allowedMimeTypes: [...imageTypes, ...videoTypes],
    });
    if (error) throw new Error(error.message);
}

export async function listMyPortfolioItems(): Promise<PortfolioItem[]> {
    const auth = await getCreatorId();
    if (!auth.creatorId) return [];

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("portfolio_items")
        .select("id, creator_id, media_url, media_type, title, description, sort_order, is_public, created_at")
        .eq("creator_id", auth.creatorId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

    if (error || !data) {
        if (error) console.error("Portfolio list error:", error);
        return [];
    }

    return data as PortfolioItem[];
}

export async function uploadPortfolioMedia(formData: FormData): Promise<ActionResult & { item?: PortfolioItem }> {
    const auth = await getCreatorId();
    if (!auth.creatorId) return { success: false, message: auth.error || "Unauthorized." };

    const file = formData.get("file");
    if (!(file instanceof File)) return { success: false, message: "Media file is required." };

    const validationError = validateFile(file);
    if (validationError) return { success: false, message: validationError };

    const mediaType = fileKind(file);
    if (!mediaType) return { success: false, message: "Unsupported media type." };

    const admin = createAdminClient();
    await ensureBucket(admin);

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (mediaType === "image" ? "jpg" : "mp4");
    const storagePath = `${auth.creatorId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage.from(portfolioBucket).upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
    });

    if (uploadError) {
        console.error("Portfolio upload error:", uploadError);
        return { success: false, message: uploadError.message };
    }

    const { data: publicUrl } = admin.storage.from(portfolioBucket).getPublicUrl(storagePath);
    const { data: item, error: insertError } = await admin
        .from("portfolio_items")
        .insert({
            creator_id: auth.creatorId,
            media_url: publicUrl.publicUrl,
            media_type: mediaType,
            title: file.name.replace(/\.[^/.]+$/, ""),
            sort_order: 0,
            is_public: true,
        })
        .select("id, creator_id, media_url, media_type, title, description, sort_order, is_public, created_at")
        .single();

    if (insertError || !item) {
        console.error("Portfolio item insert error:", insertError);
        return { success: false, message: insertError?.message || "Could not save portfolio item." };
    }

    revalidatePath("/creator-dashboard");
    revalidatePath(`/creators/${auth.creatorId}`);
    return { success: true, message: "Media uploaded.", item: item as PortfolioItem };
}

export async function updatePortfolioItem(itemId: string, values: { title?: string; description?: string; is_public?: boolean }): Promise<ActionResult> {
    const auth = await getCreatorId();
    if (!auth.creatorId) return { success: false, message: auth.error || "Unauthorized." };

    const admin = createAdminClient();
    const { error } = await admin
        .from("portfolio_items")
        .update({
            title: values.title?.trim() || null,
            description: values.description?.trim() || null,
            is_public: values.is_public !== false,
        })
        .eq("id", itemId)
        .eq("creator_id", auth.creatorId);

    if (error) {
        console.error("Portfolio update error:", error);
        return { success: false, message: error.message };
    }

    revalidatePath(`/creators/${auth.creatorId}`);
    return { success: true, message: "Portfolio item updated." };
}

export async function deletePortfolioItem(itemId: string): Promise<ActionResult> {
    const auth = await getCreatorId();
    if (!auth.creatorId) return { success: false, message: auth.error || "Unauthorized." };

    const admin = createAdminClient();
    const { error } = await admin
        .from("portfolio_items")
        .delete()
        .eq("id", itemId)
        .eq("creator_id", auth.creatorId);

    if (error) {
        console.error("Portfolio delete error:", error);
        return { success: false, message: error.message };
    }

    revalidatePath(`/creators/${auth.creatorId}`);
    return { success: true, message: "Portfolio item deleted." };
}
