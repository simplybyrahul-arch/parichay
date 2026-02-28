'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/login?error=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard') // Default redirect, can be handled dynamically later
}

export async function signup(formData: FormData, accountType: string) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            data: {
                full_name: formData.get('name') as string,
                account_type: accountType,
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
