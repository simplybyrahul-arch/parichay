type RateLimitInfo = {
    count: number;
    resetTime: number;
};

// In-memory rate limiter for Edge/Serverless environments. 
// Uses a simple Map. Note: In a completely distributed serverless deployment, 
// this is isolate-scoped, but serves as a solid first layer of defense.
const rateLimiterCache = new Map<string, RateLimitInfo>();

export async function rateLimit(ip: string, limit: number = 30, windowMs: number = 60000) {
    const now = Date.now();
    const info = rateLimiterCache.get(ip);
    
    // Garbage collection to prevent memory leaks if many unique IPs hit
    if (rateLimiterCache.size > 2000) {
        const threshold = now - windowMs;
        for (const [key, val] of rateLimiterCache.entries()) {
            if (val.resetTime < threshold) {
                rateLimiterCache.delete(key);
            }
        }
    }

    if (!info) {
        rateLimiterCache.set(ip, { count: 1, resetTime: now + windowMs });
        return { success: true, remaining: limit - 1, reset: now + windowMs };
    }

    if (now > info.resetTime) {
        info.count = 1;
        info.resetTime = now + windowMs;
        rateLimiterCache.set(ip, info);
        return { success: true, remaining: limit - 1, reset: info.resetTime };
    }

    if (info.count >= limit) {
        return { success: false, remaining: 0, reset: info.resetTime };
    }

    info.count += 1;
    rateLimiterCache.set(ip, info);
    return { success: true, remaining: limit - info.count, reset: info.resetTime };
}
