
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { useStore } from '../context/useStore'
import { useAuth } from '../context/useAuth'
import { getUserProfile } from '../services/userService'
import { saveUserOrder } from '../services/orderService'

type SectionId = 'customer' | 'address' | 'notes' | 'payment'

type Customer = {
    name: string
    phone: string
    city: string
    address: string
    notes: string
}

function CheckoutPage() {
    const navigate = useNavigate()

    const { user, loading } = useAuth()

    const {
        cartItems,
        cartTotal,
        removeFromCart,
    } = useStore()

    const FREE_SHIPPING_LIMIT = 199
    const SHIPPING_FEE = 20

    const [submitting, setSubmitting] = useState(false)

    const shippingFee =
        cartTotal < FREE_SHIPPING_LIMIT ? SHIPPING_FEE : 0

    const finalTotal = cartTotal + shippingFee

    const [customer, setCustomer] = useState<Customer>(() => {
        const defaultCustomer: Customer = {
            name: '',
            phone: '',
            city: '',
            address: '',
            notes: '',
        }

        try {
            const savedCustomer = localStorage.getItem(
                'trend247-checkout-customer'
            )

            if (savedCustomer) {
                return {
                    ...defaultCustomer,
                    ...JSON.parse(savedCustomer),
                }
            }
        } catch (error) {
            console.error('تعذر استعادة بيانات العميل:', error)
        }

        return defaultCustomer
    })

    const [activeSection, setActiveSection] =
        useState<SectionId>('customer')

    const [completedSections, setCompletedSections] =
        useState<SectionId[]>([])

    const [saveMessage, setSaveMessage] = useState('')

    // تحميل اسم العميل من الحساب
    useEffect(() => {
        if (!user) return

        const currentUser = user
        let cancelled = false

        async function loadCustomerName() {
            try {
                const profile = await getUserProfile()
                const profileName =
                    profile.name || currentUser.displayName

                if (!cancelled && profileName) {
                    setCustomer((current) => ({
                        ...current,
                        name: profileName,
                    }))
                }
            } catch (error) {
                console.error('تعذر تحميل اسم العميل:', error)

                if (!cancelled && currentUser.displayName) {
                    setCustomer((current) => ({
                        ...current,
                        name: currentUser.displayName || current.name,
                    }))
                }
            }
        }

        void loadCustomerName()

        return () => {
            cancelled = true
        }
    }, [user])

    // حفظ بيانات العميل في المتصفح
    function saveCustomerData() {
        localStorage.setItem(
            'trend247-checkout-customer',
            JSON.stringify(customer)
        )
    }

    // حفظ القسم والانتقال للقسم التالي
    function handleSaveSection(section: SectionId) {
        if (section === 'customer') {
            if (customer.name.trim().length < 2) {
                setSaveMessage('يرجى إدخال الاسم الكامل بشكل صحيح')
                return
            }

            if (!customer.phone.trim()) {
                setSaveMessage('يرجى إدخال رقم الجوال')
                return
            }
        }

        if (section === 'address') {
            if (!customer.city.trim()) {
                setSaveMessage('يرجى إدخال المدينة')
                return
            }

            if (!customer.address.trim()) {
                setSaveMessage('يرجى إدخال العنوان بالتفصيل')
                return
            }
        }

        saveCustomerData()

        setCompletedSections((current) =>
            current.includes(section)
                ? current
                : [...current, section]
        )

        setSaveMessage('تم حفظ البيانات بنجاح ✓')

        const nextSections: SectionId[] = [
            'customer',
            'address',
            'notes',
            'payment',
        ]

        const currentIndex = nextSections.indexOf(section)
        const nextSection = nextSections[currentIndex + 1]

        if (nextSection) {
            setTimeout(() => {
                setActiveSection(nextSection)
                setSaveMessage('')
            }, 450)
        }
    }

    // فتح القسم
    function toggleSection(section: SectionId) {
        setActiveSection(section)
        setSaveMessage('')
    }

    // تأكيد الطلب
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (submitting) return

        if (!customer.name.trim() || !customer.phone.trim()) {
            setActiveSection('customer')
            setSaveMessage('يرجى إكمال معلومات العميل وحفظها')
            return
        }

        if (!customer.city.trim() || !customer.address.trim()) {
            setActiveSection('address')
            setSaveMessage('يرجى إكمال عنوان التوصيل وحفظه')
            return
        }

        if (cartItems.length === 0) {
            setSaveMessage('سلتك فارغة، أضف منتجات قبل تأكيد الطلب')
            return
        }

        if (!user) {
            navigate('/login', {
                replace: true,
                state: { from: '/checkout' },
            })
            return
        }

        setSubmitting(true)
        setSaveMessage('جارٍ تأكيد طلبك وحفظه...')

        const orderId = `TR-${Date.now()}`

        // تجهيز المنتجات مع اللون والمقاس والسعر النهائي
        const orderItems = cartItems.map((item) => {
            const unitPrice =
                item.unitPrice ?? item.price

            return {
                id: item.id,
                variantKey: item.variantKey ?? String(item.id),
                name: item.name,
                image: item.image,

                price: unitPrice,
                quantity: item.quantity,
                subtotal: unitPrice * item.quantity,

                selectedColor: item.selectedColor
                    ? {
                        id: item.selectedColor.id,
                        name: item.selectedColor.name,
                        value: item.selectedColor.value,
                    }
                    : null,

                selectedSize: item.selectedSize
                    ? {
                        id: item.selectedSize.id,
                        name: item.selectedSize.name,
                        value: item.selectedSize.value,
                    }
                    : null,
            }
        })

        const order = {
            orderId,
            userId: user.uid,
            customer,
            items: orderItems,
            subtotal: cartTotal,
            shippingFee,
            total: finalTotal,
            paymentMethod: 'الدفع عند الاستلام',
            status: 'قيد المراجعة' as const,
        }

        try {
            // حفظ الطلب في Firestore أولاً
            await saveUserOrder(order)

            // حفظ نسخة محلية لصفحة نجاح الطلب
            localStorage.setItem(
                'trend247-last-order',
                JSON.stringify({
                    ...order,
                    createdAt: new Date().toISOString(),
                })
            )

            localStorage.removeItem('trend247-checkout-customer')

            // تفريغ السلة بعد نجاح حفظ الطلب
            cartItems.forEach((item) => {
                removeFromCart(item.id, item.variantKey)
            })

            navigate('/order-success', {
                replace: true,
            })
        } catch (error) {
            console.error('تعذر حفظ الطلب:', error)

            setSaveMessage(
                'تعذر تأكيد الطلب حاليًا. لم يتم تفريغ سلتك، حاول مرة أخرى.'
            )
        } finally {
            setSubmitting(false)
        }
    }

    // حالة التحميل
    if (loading) {
        return (
            <main className="shopping-page checkout-loading">
                <div className="checkout-spinner" />
                <p>نجهّز لك تجربة تسوق مميزة...</p>
            </main>
        )
    }

    // طلب تسجيل الدخول
    if (!user) {
        return (
            <main className="shopping-page checkout-auth-page">
                <div className="checkout-auth-card">
                    <div className="checkout-auth-icon">
                        <span>247</span>
                    </div>

                    <span className="checkout-auth-label">
                        خطوة واحدة تفصلك عن طلبك
                    </span>

                    <h1>
                        أهلاً بك في <span>TREND247</span>
                    </h1>

                    <p className="checkout-auth-description">
                        لتأكيد طلبك ومتابعة تفاصيل التوصيل،
                        يرجى تسجيل الدخول أو إنشاء حساب جديد.
                    </p>

                    <div className="checkout-auth-benefits">
                        <div>
                            <span className="benefit-icon">✓</span>
                            <span>حفظ بيانات طلبك ومتابعتها</span>
                        </div>

                        <div>
                            <span className="benefit-icon">✓</span>
                            <span>تجربة تسوق أسهل وأكثر أمانًا</span>
                        </div>

                        <div>
                            <span className="benefit-icon">✓</span>
                            <span>سلتك ومنتجاتك ستبقى محفوظة</span>
                        </div>
                    </div>

                    <button
                        className="checkout-auth-primary"
                        onClick={() =>
                            navigate('/login', {
                                state: { from: '/checkout' },
                            })
                        }
                    >
                        تسجيل الدخول أو إنشاء حساب
                        <span>←</span>
                    </button>

                    <button
                        className="checkout-auth-secondary"
                        onClick={() => navigate('/cart')}
                    >
                        العودة إلى السلة
                    </button>

                    <div className="checkout-auth-footer">
                        <span>✦</span>
                        تسوق بثقة، كل ما هو ترند في مكان واحد
                    </div>
                </div>
            </main>
        )
    }

    // السلة فارغة
    if (cartItems.length === 0) {
        return (
            <main className="shopping-page">
                <h2>لا توجد منتجات لإتمام الطلب</h2>

                <button onClick={() => navigate('/')}>
                    العودة للمتجر
                </button>
            </main>
        )
    }

    return (
        <main className="shopping-page checkout-page">
            <div className="checkout-heading">
                <span className="checkout-brand-label">
                    TREND247 EXCLUSIVE EXPERIENCE
                </span>

                <h1>إتمام الطلب</h1>

                <p>
                    خطوات بسيطة تفصلك عن استلام منتجاتك المفضلة
                </p>
            </div>

            <div className="checkout-layout">
                <form
                    className="checkout-form"
                    onSubmit={handleSubmit}
                >
                    {/* معلومات العميل */}
                    <section
                        className={`checkout-accordion ${activeSection === 'customer' ? 'is-open' : ''
                            } ${completedSections.includes('customer')
                                ? 'is-completed'
                                : ''
                            }`}
                    >
                        <button
                            type="button"
                            className="checkout-accordion-header"
                            onClick={() => toggleSection('customer')}
                        >
                            <span className="checkout-step-number">
                                {completedSections.includes('customer')
                                    ? '✓'
                                    : '01'}
                            </span>

                            <span className="checkout-accordion-title">
                                <strong>معلومات العميل</strong>
                                <small>الاسم الكامل ورقم التواصل</small>
                            </span>

                            <span className="checkout-accordion-arrow">
                                ⌄
                            </span>
                        </button>

                        <div className="checkout-accordion-content">
                            <div className="checkout-accordion-inner">
                                <div className="checkout-fields-grid">
                                    <div className="checkout-field">
                                        <label>الاسم الكامل</label>

                                        <input
                                            value={customer.name}
                                            onChange={(e) =>
                                                setCustomer({
                                                    ...customer,
                                                    name: e.target.value,
                                                })
                                            }
                                            placeholder="أدخل اسمك الكامل"
                                        />
                                    </div>

                                    <div className="checkout-field">
                                        <label>رقم الجوال</label>

                                        <input
                                            type="tel"
                                            value={customer.phone}
                                            onChange={(e) =>
                                                setCustomer({
                                                    ...customer,
                                                    phone: e.target.value,
                                                })
                                            }
                                            placeholder="05xxxxxxxx"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="checkout-save-button"
                                    onClick={() =>
                                        handleSaveSection('customer')
                                    }
                                >
                                    حفظ البيانات والمتابعة
                                    <span>←</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* عنوان التوصيل */}
                    <section
                        className={`checkout-accordion ${activeSection === 'address' ? 'is-open' : ''
                            } ${completedSections.includes('address')
                                ? 'is-completed'
                                : ''
                            }`}
                    >
                        <button
                            type="button"
                            className="checkout-accordion-header"
                            onClick={() => toggleSection('address')}
                        >
                            <span className="checkout-step-number">
                                {completedSections.includes('address')
                                    ? '✓'
                                    : '02'}
                            </span>

                            <span className="checkout-accordion-title">
                                <strong>عنوان التوصيل</strong>
                                <small>المدينة والعنوان بالتفصيل</small>
                            </span>

                            <span className="checkout-accordion-arrow">
                                ⌄
                            </span>
                        </button>

                        <div className="checkout-accordion-content">
                            <div className="checkout-accordion-inner">
                                <div className="checkout-field">
                                    <label>المدينة</label>

                                    <input
                                        value={customer.city}
                                        onChange={(e) =>
                                            setCustomer({
                                                ...customer,
                                                city: e.target.value,
                                            })
                                        }
                                        placeholder="مثال: الرياض"
                                    />
                                </div>

                                <div className="checkout-field">
                                    <label>العنوان بالتفصيل</label>

                                    <textarea
                                        value={customer.address}
                                        onChange={(e) =>
                                            setCustomer({
                                                ...customer,
                                                address: e.target.value,
                                            })
                                        }
                                        placeholder="الحي، الشارع، رقم المبنى..."
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="checkout-save-button"
                                    onClick={() =>
                                        handleSaveSection('address')
                                    }
                                >
                                    حفظ العنوان والمتابعة
                                    <span>←</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* ملاحظات الطلب */}
                    <section
                        className={`checkout-accordion ${activeSection === 'notes' ? 'is-open' : ''
                            } ${completedSections.includes('notes')
                                ? 'is-completed'
                                : ''
                            }`}
                    >
                        <button
                            type="button"
                            className="checkout-accordion-header"
                            onClick={() => toggleSection('notes')}
                        >
                            <span className="checkout-step-number">
                                {completedSections.includes('notes')
                                    ? '✓'
                                    : '03'}
                            </span>

                            <span className="checkout-accordion-title">
                                <strong>ملاحظات الطلب</strong>
                                <small>تعليمات إضافية (اختياري)</small>
                            </span>

                            <span className="checkout-accordion-arrow">
                                ⌄
                            </span>
                        </button>

                        <div className="checkout-accordion-content">
                            <div className="checkout-accordion-inner">
                                <div className="checkout-field">
                                    <label>ملاحظات للمندوب</label>

                                    <textarea
                                        value={customer.notes}
                                        onChange={(e) =>
                                            setCustomer({
                                                ...customer,
                                                notes: e.target.value,
                                            })
                                        }
                                        placeholder="اكتب أي تعليمات ترغب بإضافتها..."
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="checkout-save-button"
                                    onClick={() =>
                                        handleSaveSection('notes')
                                    }
                                >
                                    حفظ ومتابعة
                                    <span>←</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* طريقة الدفع */}
                    <section
                        className={`checkout-accordion ${activeSection === 'payment' ? 'is-open' : ''
                            } ${completedSections.includes('payment')
                                ? 'is-completed'
                                : ''
                            }`}
                    >
                        <button
                            type="button"
                            className="checkout-accordion-header"
                            onClick={() => toggleSection('payment')}
                        >
                            <span className="checkout-step-number">
                                {completedSections.includes('payment')
                                    ? '✓'
                                    : '04'}
                            </span>

                            <span className="checkout-accordion-title">
                                <strong>طريقة الدفع</strong>
                                <small>اختر طريقة الدفع المتاحة</small>
                            </span>

                            <span className="checkout-accordion-arrow">
                                ⌄
                            </span>
                        </button>

                        <div className="checkout-accordion-content">
                            <div className="checkout-accordion-inner">
                                <div className="checkout-payment-card">
                                    <span className="payment-cash-icon">
                                        💵
                                    </span>

                                    <div>
                                        <strong>الدفع عند الاستلام</strong>
                                        <p>
                                            ادفع قيمة طلبك عند وصوله إليك
                                        </p>
                                    </div>

                                    <span className="payment-selected">
                                        ✓
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="checkout-save-button"
                                    onClick={() =>
                                        handleSaveSection('payment')
                                    }
                                >
                                    حفظ طريقة الدفع
                                    <span>✓</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {saveMessage && (
                        <div className="checkout-save-message">
                            {saveMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="checkout-confirm-button"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                جارٍ تأكيد الطلب...
                                <span className="checkout-button-spinner" />
                            </>
                        ) : (
                            <>
                                تأكيد الطلب الآن
                                <span>←</span>
                            </>
                        )}
                    </button>

                    <p className="checkout-secure-note">
                        🔒 بياناتك محفوظة بأمان لإتمام طلبك
                    </p>
                </form>

                {/* ملخص المنتجات والأسعار */}
                <aside className="cart-summary checkout-order-summary">
                    <div className="checkout-summary-heading">
                        <h2>ملخص طلبك</h2>
                        <span>{cartItems.length} منتجات</span>
                    </div>

                    <div className="checkout-products-list">
                        {cartItems.map((item) => {
                            const unitPrice =
                                item.unitPrice ?? item.price

                            return (
                                <div
                                    className="checkout-product-item"
                                    key={item.variantKey ?? item.id}
                                >
                                    <div className="checkout-product-image">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                        />
                                    </div>

                                    <div className="checkout-product-info">
                                        <h3>{item.name}</h3>

                                        {item.selectedColor && (
                                            <span className="checkout-product-option">
                                                اللون: {item.selectedColor.value}
                                            </span>
                                        )}

                                        {item.selectedSize && (
                                            <span className="checkout-product-option">
                                                المقاس: {item.selectedSize.value}
                                            </span>
                                        )}

                                        <span className="checkout-product-quantity">
                                            الكمية: {item.quantity}
                                        </span>

                                        <strong>
                                            {unitPrice * item.quantity} ر.س
                                        </strong>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <hr />

                    <div className="checkout-price-row">
                        <span>مجموع المنتجات</span>
                        <strong>{cartTotal} ر.س</strong>
                    </div>

                    <div className="checkout-price-row">
                        <span>رسوم الشحن</span>

                        {shippingFee === 0 ? (
                            <strong className="free-shipping">
                                مجاني
                            </strong>
                        ) : (
                            <strong>{shippingFee} ر.س</strong>
                        )}
                    </div>

                    {shippingFee > 0 && (
                        <p className="shipping-notice">
                            أضف {(FREE_SHIPPING_LIMIT - cartTotal).toFixed(2)}
                            {' '}ر.س لتحصل على شحن مجاني!
                        </p>
                    )}

                    {shippingFee === 0 && (
                        <p className="shipping-notice shipping-success">
                            مبروك! حصلت على شحن مجاني 🎉
                        </p>
                    )}

                    <hr />

                    <div className="cart-total checkout-final-total">
                        <span>الإجمالي النهائي</span>
                        <strong>{finalTotal} ر.س</strong>
                    </div>

                    <p className="checkout-summary-footer">
                        السعر النهائي شامل رسوم الشحن
                    </p>
                </aside>
            </div>
        </main>
    )
}

export default CheckoutPage
