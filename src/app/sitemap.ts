import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'http://localhost:3000'; // Change to production URL

    // Add all static routes
    const routes = [
        '',
        '/book',
        '/search',
        '/login',
        '/signup',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // Assuming dynamic fetching of creators happens here for production
    // Example dummy data for creators:
    const creatorIds = ['123', '456', '789'];
    const creatorRoutes = creatorIds.map((id) => ({
        url: `${baseUrl}/creators/${id}`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
    }));

    return [...routes, ...creatorRoutes];
}
