'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { calculateProfileCompletion } from '@/lib/equipment/vendors'
import { rateLimit } from '@/utils/rate-limit'
import {
    AUTH_RATE_LIMIT_WINDOW_MS,
    getAuthCallbackUrl,
    isValidEmail,
    normalizeEmail,
    validatePasswordStrength,
} from '@/utils/auth-security'
import { LEGAL_TERMS_VERSION } from '@/lib/legal/legalContent'

type AuthActionResult = {
    success: boolean;
    message: string;
    redirectTo?: string;
};

const portfolioBucket = 'creator-portfolio';
const imagePortfolioTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const videoPortfolioTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const maxPortfolioImageSize = 10 * 1024 * 1024;
const maxPortfolioVideoSize = 100 * 1024 * 1024;

function getEmailRedirectTo() {
    return getAuthCallbackUrl('/login?verified=1');
}

function getPasswordResetRedirectTo() {
    return getAuthCallbackUrl('/update-password');
}

function isEmailConfirmed(user: { email_confirmed_at?: string | null; confirmed_at?: string | null } | null | undefined) {
    return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function createOptionalAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) return null;

    return createSupabaseAdminClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

function toBoolean(value: FormDataEntryValue | null, fallback: boolean) {
    if (value === null) return fallback;
    return String(value) === 'true';
}

function toPositiveNumber(value: FormDataEntryValue | null) {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) && numberValue > 0 ? Math.round(numberValue) : 0;
}

function toStringArray(value: FormDataEntryValue | null) {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function createSlug(value: string, id: string) {
    const base = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'creator';
    return `${base}-${id.slice(0, 8)}`;
}

function getPortfolioMediaType(file: File): 'image' | 'video' | null {
    if (imagePortfolioTypes.has(file.type)) return 'image';
    if (videoPortfolioTypes.has(file.type)) return 'video';
    return null;
}

function validatePortfolioSignupFile(file: File) {
    const mediaType = getPortfolioMediaType(file);
    if (!mediaType) return 'Supported files: jpg, png, webp, mp4, mov, webm.';
    if (mediaType === 'image' && file.size > maxPortfolioImageSize) return 'Images must be 10MB or smaller.';
    if (mediaType === 'video' && file.size > maxPortfolioVideoSize) return 'Videos must be 100MB or smaller.';
    return null;
}

async function ensurePortfolioBucket(admin: ReturnType<typeof createOptionalAdminClient>) {
    if (!admin) return;
    const { data: buckets, error: listError } = await admin.storage.listBuckets();
    if (listError) throw listError;
    if (buckets?.some((bucket) => bucket.name === portfolioBucket)) return;

    const { error } = await admin.storage.createBucket(portfolioBucket, {
        public: true,
        fileSizeLimit: maxPortfolioVideoSize,
        allowedMimeTypes: [...imagePortfolioTypes, ...videoPortfolioTypes],
    });
    if (error) throw error;
}

async function recordUserConsent(
    admin: ReturnType<typeof createOptionalAdminClient>,
    userId: string,
    role: string,
    accountType: string
) {
    if (!admin) return;

    const { error } = await admin.from('user_consents').insert({
        user_id: userId,
        role,
        accepted_terms: true,
        accepted_privacy: true,
        accepted_refund_policy: true,
        accepted_creator_agreement: accountType === 'creator',
        accepted_equipment_terms: accountType === 'equipment_vendor',
        accepted_ai_disclaimer: true,
        terms_version: LEGAL_TERMS_VERSION,
    });

    if (error) {
        console.error('User consent insert error:', error);
    }
}

async function getClientIp() {
    const headerStore = await headers();
    return (headerStore.get('x-real-ip') || headerStore.get('x-forwarded-for') || '127.0.0.1')
        .split(',')[0]
        .trim();
}

async function enforceAuthRateLimit(action: string, email?: string) {
    const ip = await getClientIp();
    const key = `${action}:${ip}:${email || 'anonymous'}`;
    const { success, reset } = await rateLimit(key, 5, AUTH_RATE_LIMIT_WINDOW_MS);

    if (!success) {
        const retrySeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return `Too many attempts. Please try again in ${Math.ceil(retrySeconds / 60)} minute(s).`;
    }

    return null;
}

export async function login(formData: FormData): Promise<AuthActionResult> {
    const supabase = await createClient()

    const email = normalizeEmail(formData.get('email'))
    const password = formData.get('password') as string

    if (!isValidEmail(email) || !password || password.length < 8) {
        return { success: false, message: 'Invalid input provided.' }
    }

    const rateLimitMessage = await enforceAuthRateLimit('login', email);
    if (rateLimitMessage) return { success: false, message: rateLimitMessage };

    const data = {
        email,
        password: password,
    }

    const { data: { session, user }, error } = await supabase.auth.signInWithPassword(data)

    if (error || !session) {
        return { success: false, message: 'Invalid email or password. Please try again.' }
    }

    if (!isEmailConfirmed(user)) {
        await supabase.auth.signOut()
        return { success: false, message: 'Please verify your email before logging in.' }
    }

    revalidatePath('/', 'layout')

    const { data: publicUser, error: publicUserError } = await supabase
        .from('users')
        .select('account_type')
        .eq('id', user.id)
        .maybeSingle()

    if (publicUserError) {
        console.error('Login role lookup error:', publicUserError)
    }

    // Role-based routing. Prefer the public profile role so admin fixes made in Supabase are respected.
    const accountType = publicUser?.account_type || session.user.user_metadata?.account_type

    if (accountType === 'creator') {
        return { success: true, message: 'Login successful.', redirectTo: '/creator-dashboard' }
    } else if (accountType === 'equipment_vendor') {
        return { success: true, message: 'Login successful.', redirectTo: '/vendor-dashboard' }
    } else if (accountType === 'admin') {
        return { success: true, message: 'Login successful.', redirectTo: '/admin' }
    } else {
        // Default to client dashboard
        return { success: true, message: 'Login successful.', redirectTo: '/dashboard' }
    }
}

export async function signup(formData: FormData, accountType: string, creatorType?: string): Promise<AuthActionResult> {
    const supabase = await createClient()

    const email = normalizeEmail(formData.get('email'))
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const role = String(formData.get('role') || '').trim()
    const phone = String(formData.get('phone') || '').trim()
    const whatsappPhone = String(formData.get('whatsapp_phone') || '').trim()
    const city = String(formData.get('city') || '').trim()
    const state = String(formData.get('state') || '').trim()
    const dayRate = toPositiveNumber(formData.get('day_rate'))
    const portfolioUrl = String(formData.get('portfolio_url') || '').trim()
    const bio = String(formData.get('bio') || '').trim()
    const location = String(formData.get('location') || '').trim()
    const serviceTags = toStringArray(formData.get('service_tags'))
    const eventTags = toStringArray(formData.get('event_tags'))
    const equipmentTags = toStringArray(formData.get('equipment_tags'))
    const postProductionTags = toStringArray(formData.get('post_production_tags'))
    const serviceCities = toStringArray(formData.get('service_cities'))
    const serviceRadiusKm = toPositiveNumber(formData.get('service_radius_km'))
    const capacityPerDay = toPositiveNumber(formData.get('capacity_per_day'))
    const whatsappOptIn = toBoolean(formData.get('whatsapp_opt_in'), true)
    const availableForBooking = toBoolean(formData.get('available_for_booking'), true)
    const budgetFlexibility = toBoolean(formData.get('budget_flexibility'), false)
    const travelEnabled = toBoolean(formData.get('travel_enabled'), false)
    const vendorContactName = String(formData.get('vendor_contact_name') || '').trim()
    const vendorWarehouseAddress = String(formData.get('vendor_warehouse_address') || '').trim()
    const vendorGstNumber = String(formData.get('vendor_gst_number') || '').trim()
    const vendorYearsInBusiness = toPositiveNumber(formData.get('vendor_years_in_business'))
    const vendorDeliveryAvailable = toBoolean(formData.get('vendor_delivery_available'), false)
    const vendorOperatorSupport = toBoolean(formData.get('vendor_operator_support_available'), false)
    const vendorEquipmentCategories = String(formData.get('vendor_equipment_categories') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    const acceptedPlatformPolicies = String(formData.get('accepted_platform_policies') || '') === 'true'

    if (!isValidEmail(email) || !password || !name) {
        return { success: false, message: 'Invalid registration payload provided.' }
    }

    if (!acceptedPlatformPolicies) {
        return { success: false, message: 'Please accept ShotcutCrew platform policies to continue.' }
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) return { success: false, message: passwordError };

    const rateLimitMessage = await enforceAuthRateLimit('signup', email);
    if (rateLimitMessage) return { success: false, message: rateLimitMessage };

    if (accountType === 'creator') {
        const cleanedPhone = phone.replace(/[^\d+]/g, '')
        if (!creatorType || !role || serviceTags.length === 0 || !city || cleanedPhone.length < 10) {
            return { success: false, message: 'Creator phone, city, main service, and services offered are required.' }
        }
    }

    if (accountType === 'equipment_vendor') {
        const cleanedPhone = phone.replace(/[^\d+]/g, '')
        if (!name.trim() || !vendorContactName || !city || cleanedPhone.length < 10 || !vendorWarehouseAddress || vendorEquipmentCategories.length === 0) {
            return { success: false, message: 'Vendor business name, contact, phone, city, warehouse address, and equipment categories are required.' }
        }
    }

    const data = {
        email,
        password: password,
        options: {
            emailRedirectTo: getEmailRedirectTo(),
            data: {
                full_name: name.trim(),
                account_type: accountType,
                ...(creatorType ? { creator_type: creatorType } : {}),
                ...(accountType === 'creator' ? {
                    role,
                    phone,
                    whatsapp_phone: whatsappPhone || (whatsappOptIn ? phone : ''),
                    city,
                    state,
                    day_rate: dayRate,
                    portfolio_url: portfolioUrl,
                    service_tags: serviceTags,
                    event_tags: eventTags,
                    equipment_tags: equipmentTags,
                    post_production_tags: postProductionTags,
                    service_cities: serviceCities,
                    service_radius_km: serviceRadiusKm,
                    capacity_per_day: capacityPerDay,
                    whatsapp_opt_in: whatsappOptIn,
                    available_for_booking: availableForBooking,
                    budget_flexibility: budgetFlexibility,
                    travel_enabled: travelEnabled,
                } : {}),
                ...(accountType === 'equipment_vendor' ? {
                    provider_type: 'equipment_vendor',
                    provider_subtype: 'rental_house',
                    contact_name: vendorContactName,
                    phone,
                    whatsapp_phone: whatsappPhone || phone,
                    city,
                    state,
                    warehouse_address: vendorWarehouseAddress,
                    gst_number: vendorGstNumber,
                    years_in_business: vendorYearsInBusiness,
                    delivery_available: vendorDeliveryAvailable,
                    operator_support_available: vendorOperatorSupport,
                    equipment_categories: vendorEquipmentCategories,
                } : {}),
            }
        }
    }

    const { data: signupData, error } = await supabase.auth.signUp(data)

    if (error) {
        return { success: false, message: error.message || 'Could not create user.' }
    }

    if (accountType === 'creator' && signupData.user) {
        const admin = createOptionalAdminClient();
        if (admin) {
            await recordUserConsent(admin, signupData.user.id, creatorType === 'studio_owner' ? 'studio' : 'creator', accountType);

            await admin.from('provider_profiles').upsert({
                user_id: signupData.user.id,
                provider_type: creatorType === 'studio_owner' ? 'studio' : 'creator',
                provider_subtype: creatorType === 'studio_owner' ? 'studio' : 'freelancer',
                business_name: name.trim(),
                contact_name: name.trim(),
                city,
                state: state || null,
                profile_completion: 40,
            }, { onConflict: 'user_id' });

            const { error: creatorError } = await admin.from('creators').upsert({
                id: signupData.user.id,
                slug: createSlug(name.trim(), signupData.user.id),
                role,
                primary_service: role,
                service_tags: serviceTags.length > 0 ? serviceTags : [role],
                event_tags: eventTags,
                equipment_tags: equipmentTags,
                post_production_tags: postProductionTags,
                phone,
                whatsapp_phone: whatsappPhone || (whatsappOptIn ? phone : null),
                bio: bio || null,
                city,
                state: state || null,
                location: location || city,
                day_rate: dayRate,
                portfolio_url: portfolioUrl ? JSON.stringify({ link: portfolioUrl, items: [] }) : null,
                service_cities: serviceCities,
                service_radius_km: serviceRadiusKm,
                capacity_per_day: capacityPerDay || null,
                creator_type: creatorType,
                whatsapp_opt_in: whatsappOptIn,
                available_for_booking: availableForBooking,
                budget_flexibility: budgetFlexibility,
                travel_enabled: travelEnabled,
            }, { onConflict: 'id' });

            if (creatorError) {
                console.error('Creator profile signup upsert error:', creatorError);
            }

            const portfolioFiles = formData.getAll('portfolio_files').filter((file): file is File => file instanceof File && file.size > 0);
            if (portfolioFiles.length > 0) {
                try {
                    await ensurePortfolioBucket(admin);
                    const titles = formData.getAll('portfolio_titles').map((item) => String(item || '').trim());
                    const descriptions = formData.getAll('portfolio_descriptions').map((item) => String(item || '').trim());
                    const featuredFlags = formData.getAll('portfolio_featured').map((item) => String(item) === 'true');
                    const publicFlags = formData.getAll('portfolio_public').map((item) => String(item) !== 'false');

                    for (const [index, file] of portfolioFiles.entries()) {
                        const validationError = validatePortfolioSignupFile(file);
                        if (validationError) {
                            console.error(`Portfolio signup upload skipped for ${file.name}: ${validationError}`);
                            continue;
                        }

                        const mediaType = getPortfolioMediaType(file);
                        if (!mediaType) continue;

                        const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (mediaType === 'image' ? 'jpg' : 'mp4');
                        const storagePath = `${signupData.user.id}/${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`;
                        const bytes = Buffer.from(await file.arrayBuffer());
                        const { error: uploadError } = await admin.storage.from(portfolioBucket).upload(storagePath, bytes, {
                            contentType: file.type,
                            upsert: false,
                        });

                        if (uploadError) {
                            console.error('Portfolio signup upload error:', uploadError);
                            continue;
                        }

                        const { data: publicUrl } = admin.storage.from(portfolioBucket).getPublicUrl(storagePath);
                        const { error: insertPortfolioError } = await admin.from('portfolio_items').insert({
                            creator_id: signupData.user.id,
                            media_url: publicUrl.publicUrl,
                            media_type: mediaType,
                            title: titles[index] || file.name.replace(/\.[^/.]+$/, ''),
                            description: descriptions[index] || null,
                            featured: Boolean(featuredFlags[index]),
                            sort_order: index,
                            is_public: publicFlags[index] !== false,
                            event_tags: eventTags,
                        });

                        if (insertPortfolioError) {
                            console.error('Portfolio signup item insert error:', insertPortfolioError);
                        }
                    }
                } catch (portfolioError) {
                    console.error('Portfolio signup media processing error:', portfolioError);
                }
            }
        }
    }

    if (accountType === 'equipment_vendor' && signupData.user) {
        const admin = createOptionalAdminClient();
        if (admin) {
            await recordUserConsent(admin, signupData.user.id, 'equipment_vendor', accountType);

            const profileCompletion = calculateProfileCompletion({
                businessName: name,
                contactName: vendorContactName,
                city,
                phone,
                warehouseAddress: vendorWarehouseAddress,
                equipmentCategories: vendorEquipmentCategories,
                deliveryAvailable: vendorDeliveryAvailable,
            });

            const { data: providerProfile, error: providerError } = await admin
                .from('provider_profiles')
                .upsert({
                    user_id: signupData.user.id,
                    provider_type: 'equipment_vendor',
                    provider_subtype: 'rental_house',
                    business_name: name.trim(),
                    contact_name: vendorContactName,
                    city,
                    state: state || null,
                    profile_completion: profileCompletion,
                    verified: false,
                }, { onConflict: 'user_id' })
                .select('id')
                .single();

            if (providerError || !providerProfile) {
                console.error('Equipment vendor provider signup upsert error:', providerError);
            } else {
                const { error: vendorError } = await admin
                    .from('equipment_vendor_profiles')
                    .upsert({
                        provider_id: providerProfile.id,
                        phone,
                        whatsapp_phone: whatsappPhone || phone,
                        warehouse_address: vendorWarehouseAddress,
                        gst_number: vendorGstNumber || null,
                        years_in_business: vendorYearsInBusiness || null,
                        delivery_available: vendorDeliveryAvailable,
                        operator_support_available: vendorOperatorSupport,
                        equipment_categories: vendorEquipmentCategories,
                    }, { onConflict: 'provider_id' });

                if (vendorError) {
                    console.error('Equipment vendor profile signup upsert error:', vendorError);
                }
            }
        }
    }

    if (accountType === 'client' && signupData.user) {
        await recordUserConsent(createOptionalAdminClient(), signupData.user.id, 'client', accountType);
    }

    revalidatePath('/', 'layout')
    if (signupData.session) {
        await supabase.auth.signOut()
    }

    return {
        success: true,
        message: 'Account created. Please check your email and verify your account before logging in.',
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function requestPasswordReset(formData: FormData) {
    const supabase = await createClient()
    const email = normalizeEmail(formData.get('email'))
    
    if (!isValidEmail(email)) {
        return { error: 'Email is required' }
    }

    const rateLimitMessage = await enforceAuthRateLimit('password-reset', email);
    if (rateLimitMessage) return { error: rateLimitMessage };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectTo(),
    })

    if (error) {
        console.error('Password reset request error:', error.message)
    }
    
    return { success: true }
}

export async function resendVerificationEmail(formData: FormData): Promise<AuthActionResult> {
    const supabase = await createClient()
    const email = normalizeEmail(formData.get('email'))

    if (!isValidEmail(email)) {
        return { success: false, message: 'Email is required.' }
    }

    const rateLimitMessage = await enforceAuthRateLimit('resend-verification', email);
    if (rateLimitMessage) return { success: false, message: rateLimitMessage };

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
            emailRedirectTo: getEmailRedirectTo(),
        },
    })

    if (error) {
        return { success: false, message: error.message || 'Could not resend verification email.' }
    }

    return { success: true, message: 'Verification email sent. Please check your inbox and spam folder.' }
}

export async function updatePassword(formData: FormData): Promise<AuthActionResult> {
    const supabase = await createClient()
    const password = String(formData.get('password') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    const rateLimitMessage = await enforceAuthRateLimit('update-password');
    if (rateLimitMessage) return { success: false, message: rateLimitMessage };

    if (password !== confirmPassword) {
        return { success: false, message: 'Passwords do not match.' }
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) return { success: false, message: passwordError };

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, message: 'Password reset link is invalid or expired. Please request a new link.' }
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
        console.error('Password update error:', error.message)
        return { success: false, message: 'Could not update password. Please request a new reset link.' }
    }

    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    return { success: true, message: 'Password updated. Please sign in with your new password.' }
}
