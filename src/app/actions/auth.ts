'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'

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

function createSlug(value: string, id: string) {
    const base = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'creator';
    return `${base}-${id.slice(0, 8)}`;
}

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password || email.length < 5 || password.length < 8) {
        redirect('/login?error=Invalid input provided')
    }

    const data = {
        email: email.trim(),
        password: password,
    }

    const { data: { session }, error } = await supabase.auth.signInWithPassword(data)

    if (error || !session) {
        redirect('/login?error=Could not authenticate user')
    }

    revalidatePath('/', 'layout')

    // Role-based routing
    const accountType = session.user.user_metadata?.account_type

    if (accountType === 'creator') {
        redirect('/creator-dashboard')
    } else {
        // Default to client dashboard
        redirect('/dashboard')
    }
}

export async function signup(formData: FormData, accountType: string, creatorType?: string) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const role = String(formData.get('role') || '').trim()
    const phone = String(formData.get('phone') || '').trim()
    const whatsappPhone = String(formData.get('whatsapp_phone') || '').trim()
    const city = String(formData.get('city') || '').trim()
    const state = String(formData.get('state') || '').trim()
    const dayRate = toPositiveNumber(formData.get('day_rate'))
    const portfolioUrl = String(formData.get('portfolio_url') || '').trim()
    const whatsappOptIn = toBoolean(formData.get('whatsapp_opt_in'), true)
    const availableForBooking = toBoolean(formData.get('available_for_booking'), true)
    const budgetFlexibility = toBoolean(formData.get('budget_flexibility'), false)
    const travelEnabled = toBoolean(formData.get('travel_enabled'), false)

    if (!email || !password || !name || password.length < 8) {
        redirect('/signup?error=Invalid registration payload provided')
    }

    if (accountType === 'creator') {
        const cleanedPhone = phone.replace(/[^\d+]/g, '')
        if (!creatorType || !role || !city || cleanedPhone.length < 10) {
            redirect('/signup?error=Creator phone, city, and primary service are required')
        }
    }

    const data = {
        email: email.trim(),
        password: password,
        options: {
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
                    whatsapp_opt_in: whatsappOptIn,
                    available_for_booking: availableForBooking,
                    budget_flexibility: budgetFlexibility,
                    travel_enabled: travelEnabled,
                } : {}),
            }
        }
    }

    const { data: signupData, error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/signup?error=Could not create user')
    }

    if (accountType === 'creator' && signupData.user) {
        const admin = createOptionalAdminClient();
        if (admin) {
            const { error: creatorError } = await admin.from('creators').upsert({
                id: signupData.user.id,
                slug: createSlug(name.trim(), signupData.user.id),
                role,
                phone,
                whatsapp_phone: whatsappPhone || (whatsappOptIn ? phone : null),
                city,
                state: state || null,
                location: city,
                day_rate: dayRate,
                portfolio_url: portfolioUrl ? JSON.stringify({ link: portfolioUrl, items: [] }) : null,
                creator_type: creatorType,
                whatsapp_opt_in: whatsappOptIn,
                available_for_booking: availableForBooking,
                budget_flexibility: budgetFlexibility,
                travel_enabled: travelEnabled,
            }, { onConflict: 'id' });

            if (creatorError) {
                console.error('Creator profile signup upsert error:', creatorError);
            }
        }
    }

    revalidatePath('/', 'layout')
    if (accountType === 'creator') {
        redirect('/creator-dashboard')
    } else {
        redirect('/dashboard')
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
    const email = formData.get('email') as string
    
    if (!email) {
        return { error: 'Email is required' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/update-password`,
    })

    if (error) {
        return { error: error.message }
    }
    
    return { success: true }
}
