import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create an Account | Parichay",
    description: "Join Parichay today to hire verified creative professionals or list your services to top clients.",
};

export default function SignupLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children;
}
