
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import {
    loginWithEmail,
    registerWithEmail,
} from '../services/authService'

import { useAuth } from '../context/useAuth'

function LoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading } = useAuth()

    const locationState = location.state as {
        from?: string | { pathname?: string }
    } | null

    const requestedPath =
        typeof locationState?.from === 'string'
            ? locationState.from
            : locationState?.from?.pathname

    const returnPath =
        requestedPath?.startsWith('/') &&
            !requestedPath.startsWith('//') &&
            requestedPath !== '/login'
            ? requestedPath
            : '/account'

    const [isRegistering, setIsRegistering] = useState(false)
    const [justRegistered, setJustRegistered] = useState(false)

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [phone, setPhone] = useState('')

    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (user && !justRegistered) {
            navigate(returnPath, { replace: true })
        }
    }, [user, justRegistered, navigate, returnPath])

    if (loading) {
        return (
            <main className="shopping-page">
                جارٍ التحقق من الحساب...
            </main>
        )
    }

    if (user && !justRegistered) {
        return null
    }
    async function handleRegister(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setMessage('')
        setBusy(true)

        try {
            await registerWithEmail(name, email, password, phone)

            setJustRegistered(true)
            setMessage(
                `أهلاً بك ${name.trim()} في TREND247! 🎉 تم إنشاء حسابك بنجاح، وأرسلنا رسالة تحقق إلى بريدك الإلكتروني. نتمنى لك تجربة تسوق ممتعة.`
            )
        } catch (err) {
            console.error('Register Error:', err)

            const firebaseError = err as {
                code?: string
                message?: string
            }

            console.error('Error Code:', firebaseError.code)
            console.error('Error Message:', firebaseError.message)

            if (
                firebaseError.message === 'PHONE_ALREADY_REGISTERED'
            ) {
                setError('رقم الجوال مستخدم بالفعل في حساب آخر.')
            } else {
                setError(
                    `تعذر إنشاء الحساب: ${firebaseError.code || firebaseError.message || 'خطأ غير معروف'}`
                )
            }
        } finally {
            setBusy(false)
        }
    }

    async function handleEmailLogin(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setMessage('')

        const cleanEmail = email.trim()

        // اكتشاف إدخال رقم جوال بدل البريد الإلكتروني
        const phonePattern = /^[+\d][\d\s()-]{6,}$/

        if (phonePattern.test(cleanEmail)) {
            setMessage(
                '💛 نرحب بك في TREND247! تسجيل الدخول يتطلب استخدام البريد الإلكتروني الذي سجلت به عند إنشاء حسابك، بالإضافة إلى كلمة المرور. رقم الجوال مخصص لبيانات التواصل والطلبات.'
            )
            return
        }

        setBusy(true)

        try {
            await loginWithEmail(cleanEmail, password)
            navigate(returnPath, { replace: true })
        } catch (err) {
            console.error(err)
            setError('تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <main className="shopping-page auth-page" dir="rtl">
            <section className="auth-card">

                {justRegistered ? (
                    <>
                        <h1>مرحباً بك في TREND247 🎉</h1>

                        <p className="auth-message">
                            {message}
                        </p>

                        <button
                            type="button"
                            className="auth-submit"
                            onClick={() => navigate(returnPath, { replace: true })}
                        >
                            {returnPath === '/checkout'
                                ? 'متابعة إتمام الطلب'
                                : 'الانتقال إلى حسابي'}
                        </button>
                    </>
                ) : (
                    <>
                        <h1>
                            {isRegistering
                                ? 'إنشاء حساب جديد'
                                : 'مرحباً بك في ترند247'}
                        </h1>

                        <p>
                            {returnPath === '/checkout'
                                ? 'سجّل الدخول للمتابعة وإتمام طلبك.'
                                : isRegistering
                                    ? 'أنشئ حسابك واستمتع بتجربة التسوق معنا.'
                                    : 'سجل الدخول لمتابعة مشترياتك وحسابك.'}
                        </p>

                        {isRegistering ? (
                            <form onSubmit={handleRegister}>
                                <label>الاسم الكامل</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    minLength={2}
                                    placeholder="أدخل اسمك الكامل"
                                />

                                <label>البريد الإلكتروني</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="example@email.com"
                                />

                                <label>رقم الجوال</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    placeholder="05XXXXXXXX"
                                />

                                <label>كلمة المرور</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="6 أحرف على الأقل"
                                />

                                <button
                                    className="auth-submit"
                                    disabled={busy}
                                >
                                    {busy
                                        ? 'جارٍ إنشاء الحساب...'
                                        : 'إنشاء حساب جديد'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleEmailLogin}>
                                <label>البريد الإلكتروني</label>
                                <input
                                    type="text"
                                    inputMode="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value)
                                        setMessage('')
                                        setError('')
                                    }}
                                    required
                                    placeholder="example@email.com"
                                />

                                <label>كلمة المرور</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="كلمة المرور"
                                />

                                <button
                                    className="auth-submit"
                                    disabled={busy}
                                >
                                    {busy ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
                                </button>
                            </form>
                        )}

                        {message && (
                            <p className="auth-message">
                                {message}
                            </p>
                        )}

                        {error && (
                            <p className="auth-error">
                                {error}
                            </p>
                        )}

                        <div className="auth-switch">
                            {isRegistering ? (
                                <p>
                                    لديك حساب بالفعل؟{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRegistering(false)
                                            setError('')
                                            setMessage('')
                                        }}
                                    >
                                        تسجيل الدخول
                                    </button>
                                </p>
                            ) : (
                                <p>
                                    ليس لديك حساب؟{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRegistering(true)
                                            setError('')
                                            setMessage('')
                                        }}
                                    >
                                        إنشاء حساب جديد
                                    </button>
                                </p>
                            )}
                        </div>
                    </>
                )}

                <button
                    type="button"
                    className="auth-back"
                    onClick={() => navigate('/')}
                >
                    العودة إلى المتجر
                </button>
            </section>
        </main>
    )
}

export default LoginPage
