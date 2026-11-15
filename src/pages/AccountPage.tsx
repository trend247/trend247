
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getUserOrders,
    type UserOrder,
} from '../services/orderService'
import {
    sendEmailVerification,
} from 'firebase/auth'

import { auth } from '../firebase'
import { useAuth } from '../context/useAuth'

import {
    updateUserName,
    syncEmailVerification,
    type UserProfile,
    subscribeUserProfile,
} from '../services/userService'

import {
    logout,
} from '../services/authService'

function AccountPage() {
    const navigate = useNavigate()
    const { user, loading } = useAuth()

    // تنسيق تاريخ الطلب
    function formatOrderDate(date: UserOrder['createdAt']) {
        if (!date || typeof date.toDate !== 'function') {
            return 'جارٍ تحديد التاريخ'
        }

        return new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date.toDate())
    }

    // الطلبات
    const [orders, setOrders] = useState<UserOrder[]>([])
    const [ordersLoading, setOrdersLoading] = useState(true)
    const [ordersRetry, setOrdersRetry] = useState(0)
    const [ordersError, setOrdersError] = useState('')
    const [openOrderId, setOpenOrderId] = useState<string | null>(null)

    // فتح وإغلاق تفاصيل الطلب
    function toggleOrder(orderId: string) {
        setOpenOrderId((current) =>
            current === orderId ? null : orderId
        )
    }


    // مراحل تتبع الطلب
    const orderSteps = [
        'قيد المراجعة',
        'قيد التجهيز',
        'تم الشحن',
        'مكتمل',
    ]

    // تحديد المرحلة الحالية
    function getOrderStepIndex(status: string) {
        return orderSteps.indexOf(status)
    }

    // تحديد لون حالة الطلب
    function getOrderStatusClass(status: string) {
        switch (status) {
            case 'قيد المراجعة':
                return 'status-review'
            case 'قيد التجهيز':
                return 'status-preparing'
            case 'تم الشحن':
                return 'status-shipped'
            case 'مكتمل':
                return 'status-completed'
            case 'ملغي':
                return 'status-cancelled'
            default:
                return 'status-review'
        }
    }
    // تحميل طلبات العميل من Firestore
    useEffect(() => {
        if (loading || !user) return

        let active = true

        if (user) {
            const loadOrders = async () => {
                try {
                    const customerOrders = await getUserOrders(user.uid)

                    if (active) {
                        setOrders(customerOrders)
                        setOrdersError('')
                    }
                } catch (error) {
                    console.error('Error loading orders:', error)

                    if (active) {
                        setOrdersError('تعذر تحميل طلباتك. حاول تحديث الصفحة.')
                    }
                } finally {
                    if (active) {
                        setOrdersLoading(false)
                    }
                }
            }

            void loadOrders()
        }

        return () => {
            active = false
        }
    }, [user?.uid, loading, ordersRetry])

    // بيانات الحساب
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [name, setName] = useState('')
    const [editing, setEditing] = useState(false)

    // حالة الصفحة
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')


    // إعادة التوجيه إذا لم يكن المستخدم مسجلاً
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { replace: true })
        }
    }, [loading, user, navigate])

    // تحميل بيانات المستخدم
    // تحميل بيانات المستخدم ومتابعة تحديثها مباشرة
    useEffect(() => {
        if (loading || !user) return

        let active = true

        const unsubscribe = subscribeUserProfile(
            user.uid,

            (data) => {
                if (!active) return

                setProfile(data)
                setName(data.name || user.displayName || '')
                setError('')
            },

            (err) => {
                if (!active) return

                console.error('Load user profile error:', err)

                setError(
                    'تعذر تحميل بيانات الحساب. حاول تحديث الصفحة.'
                )
            }
        )

        return () => {
            active = false
            unsubscribe()
        }
    }, [user?.uid, loading])
    // تحديث اسم المستخدم
    async function handleSaveName(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        setBusy(true)
        setError('')
        setMessage('')

        try {
            const updatedName = await updateUserName(name)

            setProfile((current) =>
                current ? { ...current, name: updatedName } : current
            )

            setName(updatedName)
            setEditing(false)
            setMessage('تم تحديث اسمك بنجاح.')
        } catch (err) {
            console.error(err)
            setError('تعذر تحديث الاسم. حاول مرة أخرى.')
        } finally {
            setBusy(false)
        }
    }

    // إرسال رسالة التحقق من البريد مع معالجة أخطاء إعادة تحميل المستخدم
    async function handleSendVerification() {
        if (!user) return

        setBusy(true)
        setError('')
        setMessage('')

        try {
            await user.reload()

            const currentUser = auth.currentUser

            if (!currentUser) {
                throw new Error('AUTH_USER_NOT_FOUND')
            }

            if (currentUser.emailVerified) {
                setMessage('بريدك الإلكتروني موثّق بالفعل ✓')
                return
            }

            await sendEmailVerification(currentUser)
            setMessage('تم إرسال رسالة التحقق إلى بريدك الإلكتروني.')
        } catch (err) {
            console.error('Email verification error:', err)

            setError(
                'تعذر إرسال رسالة التحقق. تحقق من اتصالك بالإنترنت وحاول لاحقًا.'
            )
        } finally {
            setBusy(false)
        }
    }

    // فحص حالة التحقق من البريد
    async function handleCheckVerification() {
        if (!user) return

        setBusy(true)
        setError('')
        setMessage('')

        try {
            await user.reload()

            const currentUser = auth.currentUser

            if (!currentUser?.emailVerified) {
                setMessage(
                    'لم يتم تأكيد البريد بعد. افتح رابط التحقق الذي وصلك، ثم حاول مجددًا.'
                )
                return
            }

            await syncEmailVerification()

            setProfile((current) =>
                current
                    ? { ...current, emailVerified: true }
                    : current
            )

            setMessage('تم توثيق بريدك الإلكتروني بنجاح! ✓')
        } catch (err) {
            console.error('Email verification check error:', err)
            setError('تم فحص البريد، لكن تعذر تحديث بيانات الحساب.')
        } finally {
            setBusy(false)
        }
    }

    // إرسال رمز ربط الجوال

    // تسجيل الخروج
    async function handleLogout() {
        setBusy(true)
        setError('')

        try {
            await logout()
            navigate('/login', { replace: true })
        } catch (err) {
            console.error(err)
            setError('تعذر تسجيل الخروج. حاول مرة أخرى.')
            setBusy(false)
        }
    }

    // حالة التحميل
    if (loading || !user) {
        return (
            <main className="shopping-page account-loading">
                جارٍ تحميل الحساب...
            </main>
        )
    }

    return (
        <main className="shopping-page account-page" dir="rtl">
            <div className="account-container">

                <div className="account-heading">
                    <div>
                        <small>مساحتك الشخصية</small>
                        <h1>حسابي</h1>
                        <p>إدارة بياناتك ومعلومات حسابك في ترند247.</p>
                    </div>

                    <span className="account-avatar">♙</span>
                </div>

                {error && (
                    <p className="account-error">{error}</p>
                )}

                {message && (
                    <p className="account-message">{message}</p>
                )}

                <section className="account-card">
                    <h2>المعلومات الشخصية</h2>

                    {profile ? (
                        <>
                            {/* الاسم */}
                            {editing ? (
                                <form
                                    onSubmit={handleSaveName}
                                    className="account-edit-form"
                                >
                                    <label htmlFor="account-name">الاسم</label>

                                    <input
                                        id="account-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        minLength={2}
                                        maxLength={60}
                                    />

                                    <div className="account-actions">
                                        <button type="submit" disabled={busy}>
                                            {busy ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                                        </button>

                                        <button
                                            type="button"
                                            className="account-cancel"
                                            onClick={() => {
                                                setName(profile.name || '')
                                                setEditing(false)
                                            }}
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="account-info-row">
                                    <div>
                                        <small>الاسم</small>
                                        <strong>
                                            {profile.name || 'لم تتم إضافة اسم'}
                                        </strong>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setEditing(true)}
                                    >
                                        تعديل الاسم
                                    </button>
                                </div>
                            )}

                            {/* البريد الإلكتروني */}
                            <div className="account-info-row">
                                <div>
                                    <small>البريد الإلكتروني</small>
                                    <strong>{user.email || 'غير متوفر'}</strong>
                                </div>

                                <span
                                    className={
                                        user.emailVerified ? 'verified' : 'not-verified'
                                    }
                                >
                                    {user.emailVerified ? 'موثّق ✓' : 'غير موثّق'}
                                </span>
                            </div>

                            {!user.emailVerified && user.email && (
                                <div className="verification-actions">
                                    <button
                                        type="button"
                                        onClick={handleSendVerification}
                                        disabled={busy}
                                    >
                                        إرسال رسالة التحقق
                                    </button>

                                    <button
                                        type="button"
                                        className="account-secondary"
                                        onClick={handleCheckVerification}
                                        disabled={busy}
                                    >
                                        تحققت من بريدي
                                    </button>
                                </div>
                            )}


                            {/* رقم الجوال */}
                            <div className="account-info-row">
                                <div>
                                    <small>رقم الجوال</small>
                                    <strong>
                                        {profile.phone || user.phoneNumber || 'غير مضاف'}
                                    </strong>
                                </div>
                            </div>

                        </>
                    ) : (
                        <p>جارٍ تحميل بياناتك...</p>
                    )}
                </section>

                {/* طلبات العميل */}
                <section className="account-card account-orders-card">
                    <div className="account-orders-heading">
                        <div>
                            <small>سجل مشترياتك</small>
                            <h2>طلباتي</h2>
                            <p>تابع جميع طلباتك السابقة والحالية.</p>
                        </div>

                        <span className="account-orders-icon">▤</span>
                    </div>

                    {ordersLoading ? (
                        <div className="account-orders-loading">
                            <div className="checkout-spinner" />
                            <p>جارٍ تحميل طلباتك...</p>
                        </div>
                    ) : ordersError ? (
                        <div className="account-orders-empty">
                            <span>!</span>
                            <p>{ordersError}</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setOrdersError('')
                                    setOrdersLoading(true)
                                    setOrdersRetry((current) => current + 1)
                                }}
                            >
                                إعادة المحاولة
                            </button>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="account-orders-empty">
                            <span>🛍️</span>
                            <h3>لم تقم بأي طلب حتى الآن</h3>
                            <p>
                                عندما تطلب منتجاتك من TREND247 ستظهر تفاصيلها هنا.
                            </p>

                            <button
                                type="button"
                                onClick={() => navigate('/products')}
                            >
                                اكتشف المنتجات
                                <span>←</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="account-orders-count">
                                <span>إجمالي الطلبات</span>
                                <strong>{orders.length}</strong>
                            </div>

                            <div className="account-orders-list">
                                {orders.map((order) => {
                                    const isOpen = openOrderId === order.id

                                    return (
                                        <article
                                            className={`account-order-item ${isOpen ? 'is-open' : ''}`}
                                            key={order.id}
                                        >
                                            {/* زر ملخص الطلب */}
                                            <button
                                                type="button"
                                                className="account-order-toggle"
                                                onClick={() => toggleOrder(order.id)}
                                                aria-expanded={isOpen}
                                            >
                                                <div className="account-order-main">
                                                    <div className="account-order-number">
                                                        <small>رقم الطلب</small>
                                                        <strong>{order.orderId}</strong>
                                                    </div>

                                                    <span
                                                        className={`account-order-status ${getOrderStatusClass(
                                                            order.status || 'قيد المراجعة'
                                                        )}`}
                                                    >
                                                        <span className="account-status-dot" />
                                                        {order.status || 'قيد المراجعة'}
                                                    </span>
                                                </div>

                                                <div className="account-order-summary">
                                                    <span className="account-order-date">
                                                        {formatOrderDate(order.createdAt)}
                                                    </span>

                                                    <strong className="account-order-total">
                                                        {order.total.toLocaleString('ar-SA')} ر.س
                                                    </strong>

                                                    <span
                                                        className={`account-order-chevron ${isOpen ? 'active' : ''}`}
                                                    >
                                                        ⌄
                                                    </span>
                                                </div>
                                            </button>

                                            {/* التفاصيل المنسدلة */}
                                            <div
                                                className={`account-order-collapse ${isOpen ? 'expanded' : ''}`}
                                            >
                                                <div className="account-order-details-content">

                                                    <div className="account-order-details-title">
                                                        <h3>تفاصيل الطلب</h3>
                                                        <span>
                                                            {order.items.length} منتجات
                                                        </span>
                                                    </div>

                                                    {/* مسار تقدم الطلب */}
                                                    {order.status === 'ملغي' ? (
                                                        <div className="account-order-cancelled-notice">
                                                            <span>✕</span>
                                                            <div>
                                                                <strong>تم إلغاء هذا الطلب</strong>
                                                                <small>هذا الطلب لم يعد ضمن مراحل التجهيز والشحن.</small>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="account-tracking">
                                                            <div className="account-tracking-heading">
                                                                <strong>رحلة طلبك</strong>
                                                                <span>
                                                                    {order.status || 'قيد المراجعة'}
                                                                </span>
                                                            </div>

                                                            <div className="account-tracking-steps">
                                                                {orderSteps.map((step, index) => {
                                                                    const currentIndex = getOrderStepIndex(
                                                                        order.status || 'قيد المراجعة'
                                                                    )

                                                                    const isCompleted = index < currentIndex
                                                                    const isCurrent = index === currentIndex

                                                                    return (
                                                                        <div
                                                                            className={`account-tracking-step ${isCompleted ? 'completed' : ''
                                                                                } ${isCurrent ? 'current' : ''}`}
                                                                            key={step}
                                                                        >
                                                                            <div className="account-tracking-marker">
                                                                                {isCompleted ? '✓' : index + 1}
                                                                            </div>

                                                                            <span>{step}</span>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* المنتجات */}
                                                    <div className="account-order-products">
                                                        {order.items.map((item, index) => (
                                                            <div
                                                                className="account-order-product"
                                                                key={`${item.id}-${index}`}
                                                            >
                                                                <img
                                                                    src={item.image}
                                                                    alt={item.name}
                                                                />

                                                                <div className="account-order-product-info">
                                                                    <strong>{item.name}</strong>

                                                                    <small>
                                                                        الكمية: {item.quantity}
                                                                    </small>

                                                                    {item.selectedColor && (
                                                                        <small>
                                                                            اللون: {
                                                                                typeof item.selectedColor === 'string'
                                                                                    ? item.selectedColor
                                                                                    : item.selectedColor.name
                                                                            }
                                                                        </small>
                                                                    )}

                                                                    {item.selectedSize && (
                                                                        <small>
                                                                            المقاس: {
                                                                                typeof item.selectedSize === 'string'
                                                                                    ? item.selectedSize
                                                                                    : item.selectedSize.name
                                                                            }
                                                                        </small>
                                                                    )}
                                                                </div>

                                                                <b>
                                                                    {(item.price * item.quantity).toLocaleString('ar-SA')} ر.س
                                                                </b>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* المبالغ */}
                                                    <div className="account-order-details">
                                                        <div>
                                                            <span>مجموع المنتجات</span>
                                                            <strong>
                                                                {order.subtotal.toLocaleString('ar-SA')} ر.س
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>رسوم الشحن</span>
                                                            <strong>
                                                                {order.shippingFee === 0
                                                                    ? 'مجاني'
                                                                    : `${order.shippingFee.toLocaleString('ar-SA')} ر.س`}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>طريقة الدفع</span>
                                                            <strong>
                                                                {order.paymentMethod || 'غير محددة'}
                                                            </strong>
                                                        </div>

                                                        <div className="account-order-grand-total">
                                                            <span>الإجمالي النهائي</span>
                                                            <strong>
                                                                {order.total.toLocaleString('ar-SA')} ر.س
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    {/* عنوان التوصيل */}
                                                    <div className="account-order-address">
                                                        <span>عنوان التوصيل</span>
                                                        <p>
                                                            {order.customer.city} - {order.customer.address}
                                                        </p>
                                                    </div>

                                                </div>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </section>

                {/* تسجيل الخروج */}
                <button
                    type="button"
                    className="account-logout"
                    onClick={handleLogout}
                    disabled={busy}
                >
                    تسجيل الخروج
                </button>

            </div>
        </main>
    )
}

export default AccountPage
