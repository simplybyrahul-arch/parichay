import { Metadata, ResolvingMetadata } from "next";
import CreatorProfileClient from "./CreatorProfileClient";
import { createClient } from "@/utils/supabase/server";

// Mock Data Fallback (for fields not yet in DB)
export const mockCreatorStats = {
    stats: {
        jobsCompleted: 87,
        repeatClients: "92%",
        responseTime: "< 2 hours",
    },
    portfolio: [
        { id: 1, type: "video", url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80", title: "Nike - 'Run the City'" },
        { id: 2, type: "image", url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80", title: "Vogue India Editorial" },
        { id: 3, type: "image", url: "https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?w=800&q=80", title: "Sony Alpha Campaign" },
        { id: 4, type: "video", url: "https://images.unsplash.com/photo-1601506521937-01311028eeb3?w=800&q=80", title: "Zomato Original Series" },
    ],
    services: [
        { name: "Full-Day Shoot (DOP + Cam Op)", price: "₹45,000", time: "10 Hours" },
        { name: "Commercial Licensing", price: "Custom", time: "Per Project" },
        { name: "Color Grading", price: "₹15,000", time: "Per Minute" },
    ]
};

const defaultCreator = {
    id: "c1",
    name: "Arjun Mehta",
    role: "Director of Photography",
    location: "Mumbai, India",
    rating: 4.9,
    reviews: 124,
    verified: true,
    bio: "Award-winning DOP specializing in cinematic documentary and high-end commercial work. Over 10 years of experience with Arri and RED systems.",
    avatar: "https://images.unsplash.com/photo-1542385262-cea6e8a4bb2a?w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1600&q=80",
    tags: ["Cinematography", "Commercial", "Documentary", "Food & Beverage"],
    ...mockCreatorStats
};

type Props = {
    params: { id: string }
};

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const supabase = await createClient();

    // Attempt to fetch creator by ID
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
    const name = (usersData as { full_name?: string })?.full_name || defaultCreator.name;
    const role = data?.role || defaultCreator.role;
    const bio = data?.bio || defaultCreator.bio;
    const image = data?.profile_image_url || defaultCreator.avatar;

    return {
        title: `${name} - ${role} | Parichay`,
        description: bio,
        openGraph: {
            title: `${name} - ${role} | Parichay`,
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

    // Merge DB data with mock data structure if found
    const creator = dbCreator ? {
        id: dbCreator.id,
        name: dbCreator.users?.full_name || "Creator",
        role: dbCreator.role,
        location: dbCreator.location,
        rating: 5.0, // Mocked
        reviews: 0, // Mocked
        verified: dbCreator.verified,
        bio: dbCreator.bio || "No bio available.",
        avatar: dbCreator.profile_image_url || "https://images.unsplash.com/photo-1542385262-cea6e8a4bb2a?w=800&q=80",
        coverImage: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1600&q=80", // Mocked Cover
        tags: dbCreator.tags || [],
        ...mockCreatorStats
    } : defaultCreator;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: creator.name,
        jobTitle: creator.role,
        image: creator.avatar,
        description: creator.bio,
        url: `https://parichay.com/creators/${params.id}`,
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
