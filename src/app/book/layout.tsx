import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Book a Project | Parichay",
    description: "Provide details about your upcoming production to instantly match with top-rated creative professionals.",
};

export default function BookLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children;
}
