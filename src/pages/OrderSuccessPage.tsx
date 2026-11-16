
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type SavedOrder = {
    orderId: string
    userId?: string

    customer: {
        name: string
        phone: string
        city: string
        address: string
        notes?: string
    }

    items: {
        id: number
        variantKey?: string
        name: string
        image?: string
        price: number
        quantity: number
        subtotal?: number
        selectedColor?: {
            name: string
            value: string
        } | null
        selectedSize?: {
            name: string
            value: string
        } | null
    }[]

    subtotal?: number
    shippingFee?: number

    coupon?: {
        couponId: string
        code: string
        name: string
        discountType: 'percentage' | 'fixed'
        discountValue: number
        discountAmount: number
    } | null

    couponDiscount?: number
    total: number
    paymentMethod: string
    status?: string
    createdAt?: string
}

function getSavedOrder(): SavedOrder | null {
    try {
        const savedOrder = localStorage.getItem('trend247-last-order')

        return savedOrder
            ? JSON.parse(savedOrder) as SavedOrder
            : null
    } catch (error) {
        console.error('تعذر قراءة بيانات الطلب:', error)
        return null
    }
}

function OrderSuccessPage() {
    const navigate = useNavigate()
    const order = getSavedOrder()

    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    if (!order) {
        return (
            <main className="shopping-page success-empty-page">
                <div className="success-empty-icon">!</div>

                <h2>لا يوجد طلب لعرضه</h2>

                <p>
                    لم نعثر على تفاصيل طلب سابق.
                </p>

                <button
                    className="success-primary-button"
                    onClick={() => navigate('/')}
                >
                    العودة إلى المتجر
                </button>
            </main>
        )
    }

    const subtotal =
        order.subtotal ??
        order.items.reduce(
            (total, item) => total + item.price * item.quantity,
            0
        )

    const couponDiscount =
        order.couponDiscount ??
        order.coupon?.discountAmount ??
        0

    const shippingFee = order.shippingFee ?? 0

    const formatPrice = (price: number) =>
        `${Number(price || 0).toFixed(2)} ر.س`



    return (
        <main className="shopping-page success-page">

            {/* =================================
                قسم نجاح الطلب
            ================================= */}

            <div className="success-hero">

                <div className="success-icon-wrapper">
                    <div className="success-icon">✓</div>
                </div>

                <span className="success-eyebrow">
                    TREND247
                </span>

                <h1>تم استلام طلبك بنجاح!</h1>

                <p>
                    شكراً لثقتك بنا، يسعدنا اختيارك TREND247.
                    سنعمل على تجهيز طلبك في أقرب وقت.
                </p>

                <div className="success-order-number">
                    <span>رقم طلبك</span>
                    <strong dir="ltr">{order.orderId}</strong>
                </div>

                <div className="success-confirmation">
                    <span className="success-confirmation-dot" />
                    تم تسجيل طلبك بنجاح
                </div>

            </div>

            {/* =================================
                زر عرض تفاصيل الطلب
            ================================= */}

            <button
                type="button"
                className="success-status-card success-details-toggle"
                onClick={() => setIsDetailsOpen(current => !current)}
                aria-expanded={isDetailsOpen}
                aria-controls="success-order-details"
            >

                <div className="success-status-icon">
                    ✓
                </div>

                <div className="success-details-toggle-text">
                    <strong>تفاصيل طلبك</strong>

                    <p>
                        {isDetailsOpen
                            ? 'اضغط لإخفاء تفاصيل الطلب'
                            : 'اضغط هنا لعرض جميع تفاصيل طلبك'}
                    </p>
                </div>

                <span className="success-status-badge">
                    {isDetailsOpen
                        ? 'إخفاء التفاصيل'
                        : 'عرض التفاصيل'}
                </span>

                <span
                    className={`success-details-arrow ${isDetailsOpen ? 'open' : ''
                        }`}
                >
                    ⌄
                </span>

            </button>

            {/* =================================
                تفاصيل الطلب
            ================================= */}

            {isDetailsOpen && (
                <div
                    className="success-content"
                    id="success-order-details"
                >

                    {/* معلومات العميل */}
                    <section className="success-order-card">

                        <div className="success-section-heading">
                            <span className="success-section-icon">
                                👤
                            </span>

                            <div>
                                <h2>معلومات العميل</h2>
                                <p>بيانات التواصل الخاصة بك</p>
                            </div>
                        </div>

                        <div className="success-info-grid">

                            <div className="success-info-item">
                                <span>الاسم الكامل</span>
                                <strong>{order.customer.name}</strong>
                            </div>

                            <div className="success-info-item">
                                <span>رقم الجوال</span>
                                <strong dir="ltr">
                                    {order.customer.phone}
                                </strong>
                            </div>

                        </div>

                    </section>

                    {/* عنوان التوصيل */}
                    <section className="success-order-card">

                        <div className="success-section-heading">
                            <span className="success-section-icon">
                                📍
                            </span>

                            <div>
                                <h2>عنوان التوصيل</h2>
                                <p>الموقع الذي سيتم توصيل الطلب إليه</p>
                            </div>
                        </div>

                        <div className="success-info-grid">

                            <div className="success-info-item">
                                <span>المدينة</span>
                                <strong>{order.customer.city}</strong>
                            </div>

                            <div className="success-info-item success-info-full">
                                <span>العنوان بالتفصيل</span>
                                <strong>{order.customer.address}</strong>
                            </div>

                            {order.customer.notes && (
                                <div className="success-info-item success-info-full">
                                    <span>ملاحظات الطلب</span>
                                    <strong>{order.customer.notes}</strong>
                                </div>
                            )}

                        </div>

                    </section>

                    {/* المنتجات */}
                    <section className="success-order-card">

                        <div className="success-section-heading">
                            <span className="success-section-icon">
                                🛍️
                            </span>

                            <div>
                                <h2>منتجات طلبك</h2>
                                <p>
                                    {order.items.length} منتجات في هذا الطلب
                                </p>
                            </div>
                        </div>

                        <div className="success-products-list">

                            {order.items.map((item, index) => (
                                <div
                                    className="success-product-item"
                                    key={
                                        item.variantKey ??
                                        `${item.id}-${index}`
                                    }
                                >

                                    <div className="success-product-image">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                            />
                                        ) : (
                                            <span>🛍️</span>
                                        )}
                                    </div>

                                    <div className="success-product-details">

                                        <strong>{item.name}</strong>

                                        {item.selectedColor && (
                                            <span>
                                                اللون: {item.selectedColor.value}
                                            </span>
                                        )}

                                        {item.selectedSize && (
                                            <span>
                                                المقاس: {item.selectedSize.value}
                                            </span>
                                        )}

                                        <span>
                                            الكمية: {item.quantity}
                                        </span>

                                    </div>

                                    <strong className="success-product-price">
                                        {formatPrice(
                                            item.subtotal ??
                                            item.price * item.quantity
                                        )}
                                    </strong>

                                </div>
                            ))}

                        </div>

                    </section>

                    {/* ملخص الأسعار */}
                    <section className="success-order-card">

                        <div className="success-section-heading">
                            <span className="success-section-icon">
                                🧾
                            </span>

                            <div>
                                <h2>ملخص الحساب</h2>
                                <p>تفاصيل المبالغ والخصومات</p>
                            </div>
                        </div>

                        <div className="success-price-list">

                            <div className="success-price-row">
                                <span>
                                    مجموع المنتجات بعد عروض المنتجات
                                </span>

                                <strong>
                                    {formatPrice(subtotal)}
                                </strong>
                            </div>

                            {order.coupon && couponDiscount > 0 && (
                                <div className="success-price-row success-discount-row">

                                    <span>
                                        خصم الكوبون ({order.coupon.code})
                                    </span>

                                    <strong>
                                        -{formatPrice(couponDiscount)}
                                    </strong>

                                </div>
                            )}

                            <div className="success-price-row">
                                <span>رسوم الشحن</span>

                                <strong>
                                    {shippingFee === 0
                                        ? 'مجاني'
                                        : formatPrice(shippingFee)}
                                </strong>
                            </div>

                            <div className="success-price-divider" />

                            <div className="success-total-row">
                                <span>الإجمالي النهائي</span>
                                <strong>
                                    {formatPrice(order.total)}
                                </strong>
                            </div>

                        </div>

                    </section>

                    {/* طريقة الدفع */}
                    <section className="success-payment-card">

                        <div className="success-payment-icon">
                            💵
                        </div>

                        <div>
                            <strong>طريقة الدفع</strong>
                            <p>{order.paymentMethod}</p>
                        </div>

                        <span className="success-payment-check">
                            ✓
                        </span>

                    </section>

                </div>
            )}

            {/* =================================
                الأزرار
            ================================= */}

            <div className="success-actions">

                <button
                    className="success-primary-button"
                    onClick={() => navigate('/')}
                >
                    مواصلة التسوق
                    <span>←</span>
                </button>

                <p>
                    شكراً لتسوقك معنا
                    <strong>TREND247</strong>
                </p>

            </div>

        </main>
    )
}

export default OrderSuccessPage
