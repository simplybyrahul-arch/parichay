"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/utils/audit-logger";
import { withAdminAuth } from "./admin";

export const updateSetting = await withAdminAuth(async (key: string, value: string) => {
    const supabase = await createClient();

    const { error } = await supabase
        .from('platform_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);

    if (error) {
        throw new Error(error.message);
    }

    await logAdminAction('UPDATE_PLATFORM_SETTINGS', key, { new_value: value });
    
    revalidatePath("/admin/settings");
    return { success: true };
});
