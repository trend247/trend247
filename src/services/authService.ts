import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut,
    updateProfile,
    signInWithPhoneNumber,
    linkWithPhoneNumber,
    deleteUser,
    type ConfirmationResult,
    type RecaptchaVerifier,
} from 'firebase/auth'

import {
    doc,
    setDoc,
    getDoc,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore'

import { auth, db } from '../firebase'

// =====================================
// توحيد صيغة أرقام الجوال
// =====================================

function normalizePhone(phone: string): string {
    const cleaned = phone.trim().replace(/[\s()-]/g, '')

    if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
        return cleaned
    }

    throw new Error(
        'أدخل رقم الجوال بالصيغة الدولية مع رمز الدولة، مثل +967 أو +966.'
    )
}

// =====================================
// إنشاء بريد داخلي ثابت من رقم الجوال
// لا يظهر للعميل ولا يحتاج إلى صندوق بريد
// =====================================

function phoneToInternalEmail(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    return `phone.${digits}@accounts.trend247.com`
}

// =====================================
// إنشاء حساب جديد برقم الجوال وكلمة المرور
// =====================================

export async function registerWithPhonePassword(
    phone: string,
    password: string
) {
    const normalizedPhone = normalizePhone(phone)
    const internalEmail = phoneToInternalEmail(normalizedPhone)

    if (password.length < 6) {
        throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل.')
    }

    const phoneRef = doc(db, 'phoneIndex', normalizedPhone)

    // فحص ما إذا كان الرقم مستخدمًا
    const phoneSnapshot = await getDoc(phoneRef)

    if (phoneSnapshot.exists()) {
        throw new Error('PHONE_ALREADY_REGISTERED')
    }

    // إنشاء حساب Firebase بالبريد الداخلي
    const credential = await createUserWithEmailAndPassword(
        auth,
        internalEmail,
        password
    )

    const newUser = credential.user

    try {
        await updateProfile(newUser, {
            displayName: 'عميل TREND247',
        })

        // إنشاء ملف العميل وحجز رقم الجوال معًا
        await runTransaction(db, async (transaction) => {
            const existingPhone = await transaction.get(phoneRef)

            if (existingPhone.exists()) {
                throw new Error('PHONE_ALREADY_REGISTERED')
            }

            const userRef = doc(db, 'users', newUser.uid)

            transaction.set(userRef, {
                name: 'عميل TREND247',
                email: internalEmail,
                phone: normalizedPhone,
                phoneVerified: false,
                emailVerified: false,
                createdAt: serverTimestamp(),
            })

            transaction.set(phoneRef, {
                userId: newUser.uid,
                createdAt: serverTimestamp(),
            })
        })

    } catch (error) {
        // حذف حساب Firebase الجديد إذا فشل إنشاء ملف العميل
        try {
            await deleteUser(newUser)
        } catch (cleanupError) {
            console.error(
                'Failed to clean up newly created account:',
                cleanupError
            )
        }

        throw error
    }

    // لا نرسل رسالة تحقق بالبريد الإلكتروني
    return newUser
}

// =====================================
// تسجيل الدخول برقم الجوال وكلمة المرور
// =====================================

export async function loginWithPhonePassword(
    phone: string,
    password: string
) {
    const normalizedPhone = normalizePhone(phone)
    const internalEmail = phoneToInternalEmail(normalizedPhone)

    const result = await signInWithEmailAndPassword(
        auth,
        internalEmail,
        password
    )

    return result.user
}

// =====================================
// تسجيل الدخول القديم بالبريد
// إبقاؤه مؤقتًا لتوافق أي أجزاء أخرى من المشروع
// =====================================

export async function loginWithEmail(
    email: string,
    password: string
) {
    const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
    )

    return result.user
}

// =====================================
// التسجيل القديم بالبريد
// إبقاؤه مؤقتًا لتوافق أي أجزاء أخرى من المشروع
// لا تستخدمه في واجهة التسجيل الجديدة
// =====================================

export async function registerWithEmail(
    name: string,
    email: string,
    password: string,
    phone: string
) {
    const normalizedPhone = normalizePhone(phone)
    const phoneRef = doc(db, 'phoneIndex', normalizedPhone)

    const phoneSnapshot = await getDoc(phoneRef)

    if (phoneSnapshot.exists()) {
        throw new Error('PHONE_ALREADY_REGISTERED')
    }

    const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
    )

    const newUser = credential.user

    try {
        await updateProfile(newUser, {
            displayName: name.trim(),
        })

        await runTransaction(db, async (transaction) => {
            const existingPhone = await transaction.get(phoneRef)

            if (existingPhone.exists()) {
                throw new Error('PHONE_ALREADY_REGISTERED')
            }

            const userRef = doc(db, 'users', newUser.uid)

            transaction.set(userRef, {
                name: name.trim(),
                email: email.trim(),
                phone: normalizedPhone,
                phoneVerified: false,
                emailVerified: false,
                createdAt: serverTimestamp(),
            })

            transaction.set(phoneRef, {
                userId: newUser.uid,
                createdAt: serverTimestamp(),
            })
        })

    } catch (error) {
        try {
            await deleteUser(newUser)
        } catch (cleanupError) {
            console.error('Account cleanup failed:', cleanupError)
        }

        throw error
    }

    await sendEmailVerification(newUser)

    return newUser
}

// =====================================
// وظائف ربط رقم الجوال والتحقق عبر SMS
// إبقاؤها لتوافق الأجزاء الحالية إن كانت تستخدمها
// =====================================

export async function sendPhoneLoginCode(
    phone: string,
    verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
    const cleanPhone = normalizePhone(phone)

    return signInWithPhoneNumber(auth, cleanPhone, verifier)
}

export async function confirmPhoneLogin(
    confirmation: ConfirmationResult,
    code: string
) {
    const result = await confirmation.confirm(code)
    const user = result.user

    await setDoc(
        doc(db, 'users', user.uid),
        {
            name: user.displayName || '',
            email: user.email || '',
            phone: user.phoneNumber || '',
            phoneVerified: Boolean(user.phoneNumber),
            emailVerified: user.emailVerified,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    )

    return user
}

export async function sendPhoneLinkCode(
    phone: string,
    verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
    const user = auth.currentUser

    if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً')
    }

    const cleanPhone = normalizePhone(phone)

    return linkWithPhoneNumber(user, cleanPhone, verifier)
}

export async function confirmPhoneLink(
    confirmation: ConfirmationResult,
    code: string
) {
    const result = await confirmation.confirm(code)
    const user = result.user

    await user.getIdToken(true)

    if (!user.phoneNumber) {
        throw new Error('لم يتم العثور على رقم جوال موثق')
    }

    await setDoc(
        doc(db, 'users', user.uid),
        {
            phone: user.phoneNumber,
            phoneVerified: true,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    )

    return user
}

// =====================================
// إعادة تعيين كلمة المرور بالبريد
// هذه الوظيفة لا تستخدم لحسابات الجوال الجديدة
// =====================================

export async function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email.trim())
}

// =====================================
// تحديث حالة التحقق من البريد
// =====================================

export async function refreshEmailVerification() {
    const user = auth.currentUser

    if (!user) {
        throw new Error('لا يوجد مستخدم مسجل الدخول')
    }

    await user.reload()
    await user.getIdToken(true)

    return user.emailVerified
}

// =====================================
// تسجيل الخروج
// =====================================

export async function logout() {
    return signOut(auth)
}