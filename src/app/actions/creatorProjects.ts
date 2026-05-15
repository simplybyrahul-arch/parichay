"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type ActionResult = {
    success: boolean;
    message: string;
};

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

export async function startAssignedProject(projectId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Unauthorized." };

    const admin = createAdminClient();
    const { data: creator } = await admin
        .from("creators")
        .select("id")
        .eq("id", user.id)
        .single();

    if (!creator) return { success: false, message: "Creator profile not found." };

    const { data: project, error: projectError } = await admin
        .from("projects")
        .select("id, creator_id, selected_creator_id, status")
        .eq("id", projectId)
        .single();

    if (projectError || !project) return { success: false, message: "Project not found." };
    if (project.creator_id !== user.id && project.selected_creator_id !== user.id) {
        return { success: false, message: "You can start only your assigned projects." };
    }

    if (!["funded", "confirmed"].includes(String(project.status))) {
        return { success: false, message: "Only funded or confirmed projects can be started." };
    }

    const { error: updateError } = await admin
        .from("projects")
        .update({ status: "in_progress" })
        .eq("id", projectId)
        .or(`creator_id.eq.${user.id},selected_creator_id.eq.${user.id}`);

    if (updateError) {
        console.error("Start assigned project error:", updateError);
        return { success: false, message: "Could not start project." };
    }

    revalidatePath("/creator-dashboard");
    return { success: true, message: "Project moved to in progress." };
}
