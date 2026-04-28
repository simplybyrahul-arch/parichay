import { Metadata, ResolvingMetadata } from "next";
import CreatorProfileClient from "./CreatorProfileClient";
import { createClient } from "@/utils/supabase/server";

type Props = {
    params: { id: string }
};

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const supabase = await createClient();

    const { data } = await supabase
        .from('creators')
        .select(`
            bio,
            role,
            profile_image_url,
            users ( full_name )
        `)
        .eq('id', params.id)
        .single();

    const usersData = Array.isArray(data?.users) ? data.users[0] : data?.users;
    const name = (usersData as { full_name?: string })?.full_name || "Creator";
    const role = data?.role || "Creator";
    const bio = data?.bio || "Profile details are being updated.";
    const image = data?.profile_image_url || "/logo.jpg";

    return {
        title: `${name} - ${role}`,
        description: bio,
        openGraph: {
            title: `${name} - ${role}`,
            description: bio,
            images: [image],
        },
    }
}

export default async function CreatorProfilePage({ params }: Props) {
    const supabase = await createClient();

    const { data: dbCreator } = await supabase
        .from('creators')
        .select(`
            *,
            users ( full_name )
        `)
        .eq('id', params.id)
        .single();

    const { data: creatorProjects } = await supabase
        .from('projects')
        .select('id, client_id, status')
        .eq('creator_id', params.id);

    const completedProjects = (creatorProjects || []).filter((p) => p.status === 'completed');
    const uniqueClients = new Set(completedProjects.map((p) => p.client_id));

    const usersData = Array.isArray(dbCreator?.users) ? dbCreator.users[0] : dbCreator?.users;

    const creator = dbCreator ? {
        id: dbCreator.id,
        name: (usersData as { full_name?: string })?.full_name || "Creator",
        role: dbCreator.role || "Creator",
        location: dbCreator.location || "Location not set",
        rating: 0,
        reviews: 0,
        verified: Boolean(dbCreator.verified),
        bio: dbCreator.bio || "No bio available.",
        avatar: dbCreator.profile_image_url || "/logo.jpg",
        coverImage: "/logo.jpg",
        tags: Array.isArray(dbCreator.tags) ? dbCreator.tags : [],
        stats: {
            jobsCompleted: completedProjects.length,
            repeatClients: `${uniqueClients.size}`,
            responseTime: "N/A",
        },
        portfolio: (() => {
            try {
                const parsed = JSON.parse(dbCreator.portfolio_url || "{}");
                return Array.isArray(parsed.items) ? parsed.items.map((img: any) => ({
                    id: img.id,
                    url: img.url,
                    title: "Portfolio Item",
                    type: "image"
                })) : [];
            } catch { return []; }
        })(),
        services: dbCreator.day_rate ? [{ name: "Base Day Rate", price: `₹${Number(dbCreator.day_rate).toLocaleString()}`, time: "Per Day" }] : [],
    } : {
        id: params.id,
        name: "Creator",
        role: "Creator",
        location: "Location not set",
        rating: 0,
        reviews: 0,
        verified: false,
        bio: "This creator has not completed their public profile yet.",
        avatar: "/logo.jpg",
        coverImage: "/logo.jpg",
        tags: [],
        stats: {
            jobsCompleted: 0,
            repeatClients: "0",
            responseTime: "N/A",
        },
        portfolio: [],
        services: [],
    };

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: creator.name,
        jobTitle: creator.role,
        image: creator.avatar,
        description: creator.bio,
        url: `https://shotcutcrew.com/creators/${params.id}`,
        address: {
            "@type": "PostalAddress",
            addressLocality: creator.location
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <CreatorProfileClient creator={creator} />
        </>
    );
}
