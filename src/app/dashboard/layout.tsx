import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Client Dashboard | Parichay",
    description: "Manage your creative projects, view escrow status, and communicate with creators.",
    robots: {
        index: false,
        follow: false,
    }
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children;
}
