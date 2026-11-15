
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
// توحيد صيغة أرقام الجوال الدولية
// =====================================

function normalizePhone(phone: string): string {
    const cleaned = phone.trim().replace(/[\s()-]/g, '')

    // قبول الأرقام بالصيغة الدولية E.164
    if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
        return cleaned
    }

    throw new Error(
        'أدخل رقم الجوال بالصيغة الدولية مع رمز الدولة، مثل +967 أو +966.'
    )
}

// =====================================
// إنشاء حساب بالبريد الإلكتروني
// =====================================

export async function registerWithEmail(
    name: string,
    email: string,
    password: string,
    phone: string
) {
    const normalizedPhone = normalizePhone(phone)

    // مرجع حجز رقم الجوال
    const phoneRef = doc(db, 'phoneIndex', normalizedPhone)

    // =====================================
    // الفحص الأول: قبل إنشاء حساب Authentication
    // =====================================

    const phoneSnapshot = await getDoc(phoneRef)

    if (phoneSnapshot.exists()) {
        throw new Error('PHONE_ALREADY_REGISTERED')
    }

    // =====================================
    // إنشاء حساب Authentication
    // =====================================

    const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
    )

    const newUser = credential.user

    try {
        // تحديث اسم المستخدم
        await updateProfile(newUser, {
            displayName: name.trim(),
        })

        // =====================================
        // إنشاء ملف العميل وحجز الرقم بمعاملة واحدة
        // =====================================

        await runTransaction(db, async (transaction) => {

            // إعادة فحص الرقم داخل المعاملة
            // لحماية النظام من التسجيل المتزامن
            const existingPhone = await transaction.get(phoneRef)

            if (existingPhone.exists()) {
                throw new Error('PHONE_ALREADY_REGISTERED')
            }

            const userRef = doc(db, 'users', newUser.uid)

            // إنشاء ملف العميل
            transaction.set(userRef, {
                name: name.trim(),
                email: email.trim(),
                phone: normalizedPhone,
                phoneVerified: false,
                emailVerified: false,
                createdAt: serverTimestamp(),
            })

            // حجز رقم الجوال
            // يجب أن يتطابق مع قواعد Firestore
            transaction.set(phoneRef, {
                userId: newUser.uid,
                createdAt: serverTimestamp(),
            })
        })

    } catch (error) {

        // تنظيف حساب Authentication إذا فشلت المعاملة
        try {
            await deleteUser(newUser)
        } catch (cleanupError) {
            console.error(
                'Failed to clean up newly created account:',
                cleanupError
            )
        }

        // تمرير الخطأ الأصلي دون تحويل أخطاء الصلاحيات
        throw error
    }

    // =====================================
    // إرسال رابط التحقق من البريد الإلكتروني
    // =====================================

    await sendEmailVerification(newUser)

    return newUser
}

// =====================================
// تسجيل الدخول بالبريد الإلكتروني
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
// إرسال رمز SMS لتسجيل الدخول برقم الجوال
// =====================================

export async function sendPhoneLoginCode(
    phone: string,
    verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
    const cleanPhone = normalizePhone(phone)

    return signInWithPhoneNumber(auth, cleanPhone, verifier)
}

// =====================================
// تأكيد رمز SMS وإتمام تسجيل الدخول
// =====================================

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

// =====================================
// إرسال رمز SMS لربط رقم الجوال بالحساب
// =====================================

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

// =====================================
// تأكيد رمز SMS وإتمام ربط رقم الجوال
// =====================================

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
// إعادة تعيين كلمة المرور
// =====================================

export async function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email.trim())
}

// =====================================
// تحديث حالة التحقق من البريد الإلكتروني
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
