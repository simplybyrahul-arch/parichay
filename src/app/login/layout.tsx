import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In | Parichay",
    description: "Log in to your Parichay account to manage creative productions, messages, and bookings.",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children;
}
