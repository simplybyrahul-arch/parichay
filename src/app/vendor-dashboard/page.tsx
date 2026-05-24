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

    if (profile?.account_type !== "equipment_vendor") {
        redirect(profile?.account_type === "creator" ? "/creator-dashboard" : "/dashboard");
    }

    const data = await getVendorDashboardData();
    return <VendorDashboardClient initialData={data} />;
}
