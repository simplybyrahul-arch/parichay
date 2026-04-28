'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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

    if (!email || !password || !name || password.length < 8) {
        redirect('/signup?error=Invalid registration payload provided')
    }

    const data = {
        email: email.trim(),
        password: password,
        options: {
            data: {
                full_name: name.trim(),
                account_type: accountType,
                ...(creatorType ? { creator_type: creatorType } : {}),
            }
        }
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/signup?error=Could not create user')
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
