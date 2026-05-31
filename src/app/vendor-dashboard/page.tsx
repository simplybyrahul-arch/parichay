import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVendorDashboardData } from "@/app/actions/equipmentVendors";
import { VendorDashboardClient } from "./VendorDashboardClient";

export default async function VendorDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");
    if (!user.email_confirmed_at && !user.confirmed_at) {
        await supabase.auth.signOut();
        redirect("/login?error=Please verify your email before logging in.");
    }

    const { data: profile } = await supabase
        .from("users")
        .select("account_type")
        .eq("id", user.id)
        .single();

    const { data: vendorProvider } = await supabase
        .from("provider_profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider_type", "equipment_vendor")
        .maybeSingle();

    if (profile?.account_type !== "equipment_vendor" && !vendorProvider) {
        redirect(profile?.account_type === "creator" ? "/creator-dashboard" : "/dashboard");
    }

    const data = await getVendorDashboardData();
    return <VendorDashboardClient initialData={data} />;
}
