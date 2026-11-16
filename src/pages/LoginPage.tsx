
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import {
    loginWithPhonePassword,
    registerWithPhonePassword,
} from '../services/authService'

import { useAuth } from '../context/useAuth'

type Country = {
    name: string
    flag: string
    dialCode: string
}

const countries: Country[] = [
    { name: 'السعودية', flag: '🇸🇦', dialCode: '+966' },
    { name: 'اليمن', flag: '🇾🇪', dialCode: '+967' },
    { name: 'الإمارات', flag: '🇦🇪', dialCode: '+971' },
    { name: 'الكويت', flag: '🇰🇼', dialCode: '+965' },
    { name: 'قطر', flag: '🇶🇦', dialCode: '+974' },
    { name: 'البحرين', flag: '🇧🇭', dialCode: '+973' },
    { name: 'عُمان', flag: '🇴🇲', dialCode: '+968' },
]

function toEnglishDigits(value: string) {
    return value
        .replace(/[٠-٩]/g, digit =>
            String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
        )
        .replace(/[۰-۹]/g, digit =>
            String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))
        )
}

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
    const [country, setCountry] = useState<Country>(countries[0])
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')

    const [countryMenuOpen, setCountryMenuOpen] = useState(false)
    const [countrySearch, setCountrySearch] = useState('')

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

    function getInternationalPhone() {
        let localNumber = toEnglishDigits(phone).replace(/\D/g, '')

        // حذف الصفر المحلي إذا أدخله العميل
        localNumber = localNumber.replace(/^0+/, '')

        return `${country.dialCode}${localNumber}`
    }

    async function handleRegister(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        setError('')
        setMessage('')
        setBusy(true)

        try {
            await registerWithPhonePassword(
                name,
                getInternationalPhone(),
                password
            )

            setJustRegistered(true)
            setMessage(
                `أهلاً بك ${name.trim()} في TREND247! 🎉 تم إنشاء حسابك بنجاح. نتمنى لك تجربة تسوق ممتعة.`
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
                setError(
                    'رقم الجوال مستخدم بالفعل. حاول تسجيل الدخول بدلًا من إنشاء حساب جديد.'
                )
            } else if (
                firebaseError.message?.includes('الصيغة الدولية') ||
                firebaseError.message?.includes('الاسم')
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
            await loginWithPhonePassword(
                getInternationalPhone(),
                password
            )

            navigate(returnPath, { replace: true })
        } catch (err) {
            console.error('Login Error:', err)

            setError(
                'تعذر تسجيل الدخول. تأكد من مفتاح الدولة ورقم الجوال وكلمة المرور، أو أنشئ حسابًا جديدًا.'
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
        setCountryMenuOpen(false)
    }

    const filteredCountries = countries.filter(countryItem =>
        countryItem.name.includes(countrySearch) ||
        countryItem.dialCode.includes(countrySearch)
    )

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
                            {isRegistering && (
                                <>
                                    <label>الاسم</label>

                                    <input
                                        type="text"
                                        autoComplete="name"
                                        value={name}
                                        onChange={e => {
                                            setName(e.target.value)
                                            setError('')
                                            setMessage('')
                                        }}
                                        required
                                        minLength={2}
                                        maxLength={60}
                                        placeholder="أدخل اسمك"
                                    />
                                </>
                            )}

                            <label>رقم الجوال</label>

                            <div className="phone-input-wrapper">
                                <button
                                    type="button"
                                    className="phone-country-button"
                                    onClick={() => {
                                        setCountryMenuOpen(!countryMenuOpen)
                                        setCountrySearch('')
                                    }}
                                    aria-label="اختيار الدولة ومفتاح الاتصال"
                                    aria-expanded={countryMenuOpen}
                                >
                                    <span className="phone-country-flag">
                                        {country.flag}
                                    </span>

                                    <span>{country.dialCode}</span>

                                    <span className="phone-country-arrow">
                                        ▾
                                    </span>
                                </button>

                                <input
                                    className="phone-number-input"
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel-national"
                                    value={phone}
                                    onChange={e => {
                                        const value = toEnglishDigits(
                                            e.target.value
                                        ).replace(/[^\d\s-]/g, '')

                                        setPhone(value)
                                        setError('')
                                        setMessage('')
                                    }}
                                    required
                                    placeholder="أدخل رقم الجوال"
                                />

                                {countryMenuOpen && (
                                    <div className="phone-country-menu">
                                        <input
                                            type="search"
                                            className="phone-country-search"
                                            placeholder="ابحث عن الدولة..."
                                            value={countrySearch}
                                            onChange={e =>
                                                setCountrySearch(e.target.value)
                                            }
                                            autoFocus
                                        />

                                        <div className="phone-country-list">
                                            {filteredCountries.length > 0 ? (
                                                filteredCountries.map(item => (
                                                    <button
                                                        type="button"
                                                        key={item.dialCode}
                                                        className={`phone-country-option ${country.dialCode === item.dialCode
                                                                ? 'selected'
                                                                : ''
                                                            }`}
                                                        onClick={() => {
                                                            setCountry(item)
                                                            setCountryMenuOpen(false)
                                                            setCountrySearch('')
                                                            setError('')
                                                        }}
                                                    >
                                                        <span>{item.flag}</span>

                                                        <span className="phone-country-name">
                                                            {item.name}
                                                        </span>

                                                        <span className="phone-country-code">
                                                            {item.dialCode}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="phone-country-empty">
                                                    لا توجد دولة بهذا الاسم
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <label>كلمة المرور</label>

                            <input
                                type="password"
                                autoComplete={
                                    isRegistering
                                        ? 'new-password'
                                        : 'current-password'
                                }
                                value={password}
                                onChange={e => {
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
