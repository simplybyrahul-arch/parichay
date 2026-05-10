import { createClient } from "@/utils/supabase/server";
import { UsersTable } from "./UsersTable";

export default async function UsersPage() {
    const supabase = await createClient();

    // Fetch all users
    const { data: users } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

    // Fetch all creators (to get verified status)
    const { data: creators } = await supabase
        .from("creators")
        .select("*");

    const usersData = users?.map(user => {
        const creatorData = creators?.find(c => c.id === user.id);
        return {
            ...user,
            creator_verified: creatorData?.verified || false,
            creator_role: creatorData?.role,
        };
    }) || [];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Users Management</h2>
                <p className="text-stone-500 mt-1">Manage all clients and creators across the platform.</p>
            </div>
            
            <UsersTable users={usersData} />
        </div>
    );
}
