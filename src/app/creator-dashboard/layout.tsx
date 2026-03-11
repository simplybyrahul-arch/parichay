import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Creator Dashboard",
    description: "Manage your creative jobs, escrow status, and discover new booking requests.",
    robots: {
        index: false,
        follow: false,
    }
};

export default function CreatorDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children;
}
