import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import {
    loginWithPhonePassword,
    registerWithPhonePassword,
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

    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')

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
            await registerWithPhonePassword(phone, password)

            setJustRegistered(true)
            setMessage(
                'أهلاً بك في TREND247! 🎉 تم إنشاء حسابك بنجاح. نتمنى لك تجربة تسوق ممتعة.'
            )
        } catch (err) {
            console.error('Register Error:', err)

            const firebaseError = err as {
                code?: string
                message?: string
            }

            if (
                firebaseError.message === 'PHONE_ALREADY_REGISTERED' ||
                firebaseError.code === 'auth/email-already-in-use'
            ) {
                setError('رقم الجوال مستخدم بالفعل. حاول تسجيل الدخول بدلًا من إنشاء حساب جديد.')
            } else if (
                firebaseError.message?.includes('الصيغة الدولية')
            ) {
                setError(firebaseError.message)
            } else if (
                firebaseError.code === 'auth/weak-password'
            ) {
                setError('كلمة المرور ضعيفة. استخدم 6 أحرف أو أكثر.')
            } else {
                setError(
                    `تعذر إنشاء الحساب: ${firebaseError.message || firebaseError.code || 'خطأ غير معروف'}`
                )
            }
        } finally {
            setBusy(false)
        }
    }

    async function handleLogin(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        setError('')
        setMessage('')
        setBusy(true)

        try {
            await loginWithPhonePassword(phone, password)
            navigate(returnPath, { replace: true })
        } catch (err) {
            console.error('Login Error:', err)

            setError(
                'تعذر تسجيل الدخول. تأكد من رقم الجوال وكلمة المرور، أو أنشئ حسابًا جديدًا.'
            )
        } finally {
            setBusy(false)
        }
    }

    function switchMode(registering: boolean) {
        setIsRegistering(registering)
        setError('')
        setMessage('')
        setPassword('')
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
                            onClick={() =>
                                navigate(returnPath, { replace: true })
                            }
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
                                    ? 'أنشئ حسابك وابدأ تجربة التسوق معنا.'
                                    : 'سجل الدخول لمتابعة مشترياتك وحسابك.'}
                        </p>

                        <form
                            onSubmit={
                                isRegistering
                                    ? handleRegister
                                    : handleLogin
                            }
                        >
                            <label>رقم الجوال</label>

                            <input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value)
                                    setError('')
                                    setMessage('')
                                }}
                                required
                                placeholder="+9677XXXXXXXX"
                            />

                            <label>كلمة المرور</label>

                            <input
                                type="password"
                                autoComplete={
                                    isRegistering
                                        ? 'new-password'
                                        : 'current-password'
                                }
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value)
                                    setError('')
                                    setMessage('')
                                }}
                                required
                                minLength={6}
                                placeholder={
                                    isRegistering
                                        ? '6 أحرف على الأقل'
                                        : 'أدخل كلمة المرور'
                                }
                            />

                            <button
                                className="auth-submit"
                                disabled={busy}
                            >
                                {busy
                                    ? isRegistering
                                        ? 'جارٍ إنشاء الحساب...'
                                        : 'جارٍ تسجيل الدخول...'
                                    : isRegistering
                                        ? 'إنشاء حساب جديد'
                                        : 'تسجيل الدخول'}
                            </button>
                        </form>

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
                                        onClick={() => switchMode(false)}
                                    >
                                        تسجيل الدخول
                                    </button>
                                </p>
                            ) : (
                                <p>
                                    ليس لديك حساب؟{' '}
                                    <button
                                        type="button"
                                        onClick={() => switchMode(true)}
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