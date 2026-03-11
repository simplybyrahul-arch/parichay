import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Search Creators',
    description: 'Find top Directors, DOPs, Editors, and Production Assistants by rate and location.',
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
    return children;
}
