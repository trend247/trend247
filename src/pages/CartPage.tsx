
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useStore } from '../context/useStore'
import { useAuth } from '../context/useAuth'
import {
    validateCoupon,
    type AppliedCoupon,
} from '../services/couponService'

const COUPON_STORAGE_KEY = 'trend247-applied-coupon'

function getSavedCoupon(): AppliedCoupon | null {
    try {
        const saved = localStorage.getItem(COUPON_STORAGE_KEY)
        return saved ? JSON.parse(saved) as AppliedCoupon : null
    } catch {
        localStorage.removeItem(COUPON_STORAGE_KEY)
        return null
    }
}

function CartPage() {
    const navigate = useNavigate()

    const {
        cartItems,
        cartTotal,
        cartOriginalTotal,
        cartOfferDiscount,
        updateQuantity,
        removeFromCart,
    } = useStore()

    const { user, loading: authLoading } = useAuth()

    const [couponCode, setCouponCode] = useState('')
    const [appliedCoupon, setAppliedCoupon] =
        useState<AppliedCoupon | null>(getSavedCoupon)

    const [couponLoading, setCouponLoading] = useState(false)
    const [couponError, setCouponError] = useState('')
    const [couponSuccess, setCouponSuccess] = useState('')

    const FREE_SHIPPING_LIMIT = 199
    const SHIPPING_FEE = 20

    const couponDiscount = appliedCoupon?.discountAmount ?? 0

    const subtotalAfterCoupon = Math.max(
        0,
        cartTotal - couponDiscount
    )

    const shippingFee =
        cartTotal < FREE_SHIPPING_LIMIT ? SHIPPING_FEE : 0

    const finalTotal = subtotalAfterCoupon + shippingFee

    // إعادة التحقق من الكوبون عند تغير المنتجات أو الكمية

    const appliedCouponCode = appliedCoupon?.code
    const userId = user?.uid

    useEffect(() => {
        if (!appliedCouponCode || authLoading) return

        let cancelled = false

        async function refreshCoupon() {
            if (!appliedCouponCode || !userId || cartTotal <= 0) {
                localStorage.removeItem(COUPON_STORAGE_KEY)
                setAppliedCoupon(null)
                return
            }

            try {
                const refreshedCoupon = await validateCoupon(
                    appliedCouponCode,
                    userId,
                    cartTotal
                )

                if (cancelled) return

                setAppliedCoupon(refreshedCoupon)

                localStorage.setItem(
                    COUPON_STORAGE_KEY,
                    JSON.stringify(refreshedCoupon)
                )

                setCouponError('')
                setCouponSuccess('تم تحديث خصم الكوبون بنجاح')
            } catch (error) {
                if (cancelled) return

                setAppliedCoupon(null)
                localStorage.removeItem(COUPON_STORAGE_KEY)

                setCouponError(
                    error instanceof Error
                        ? error.message
                        : 'تعذر تطبيق الكوبون على قيمة الطلب الحالية'
                )

                setCouponSuccess('')
            }
        }

        refreshCoupon()

        return () => {
            cancelled = true
        }
    }, [appliedCouponCode, userId, authLoading, cartTotal])


    async function handleApplyCoupon() {
        const normalizedCode = couponCode.trim()

        setCouponError('')
        setCouponSuccess('')

        if (!normalizedCode) {
            setCouponError('يرجى إدخال كود الخصم')
            return
        }

        if (authLoading) {
            setCouponError('يرجى الانتظار حتى يتم التحقق من حسابك')
            return
        }

        if (!user) {
            setCouponError('يجب تسجيل الدخول لاستخدام الكوبونات')
            return
        }

        if (cartTotal <= 0) {
            setCouponError('أضف منتجات إلى السلة أولاً')
            return
        }

        setCouponLoading(true)

        try {
            const coupon = await validateCoupon(
                normalizedCode,
                user.uid,
                cartTotal
            )

            setAppliedCoupon(coupon)
            setCouponCode(coupon.code)

            localStorage.setItem(
                COUPON_STORAGE_KEY,
                JSON.stringify(coupon)
            )

            setCouponSuccess(
                `تم تطبيق الكوبون بنجاح! وفرت ${coupon.discountAmount.toFixed(2)} ر.س`
            )
        } catch (error) {
            setCouponError(
                error instanceof Error
                    ? error.message
                    : 'تعذر تطبيق كود الخصم'
            )
        } finally {
            setCouponLoading(false)
        }
    }

    function handleRemoveCoupon() {
        setAppliedCoupon(null)
        setCouponCode('')
        setCouponError('')
        setCouponSuccess('تم إزالة الكوبون')
        localStorage.removeItem(COUPON_STORAGE_KEY)
    }

    if (cartItems.length === 0) {
        return (
            <main className="shopping-page">
                <h1>سلة التسوق</h1>
                <div className="empty-cart">
                    <div>🛒</div>
                    <h2>سلتك فارغة حالياً</h2>
                    <p>اكتشف منتجاتنا وأضف ما يعجبك إلى السلة.</p>
                    <button onClick={() => navigate('/')}>
                        العودة إلى المتجر
                    </button>
                </div>
            </main>
        )
    }

    return (
        <main className="shopping-page">
            <h1>سلة التسوق</h1>

            <div className="cart-page-layout">
                <section className="cart-page-items">
                    {cartItems.map((item) => {
                        const unitPrice = item.unitPrice ?? item.price
                        const originalUnitPrice =
                            item.originalUnitPrice ?? unitPrice

                        const itemTotal = unitPrice * item.quantity
                        const originalItemTotal =
                            originalUnitPrice * item.quantity

                        const itemSavings = Math.max(
                            0,
                            originalItemTotal - itemTotal
                        )

                        const hasOffer =
                            itemSavings > 0 && Boolean(item.offerName)

                        const availableStocks = [
                            item.stock,
                            item.selectedColor?.stock,
                            item.selectedSize?.stock,
                        ].filter(
                            (stock): stock is number =>
                                typeof stock === 'number'
                        )

                        const availableStock =
                            availableStocks.length > 0
                                ? Math.min(...availableStocks)
                                : undefined

                        return (
                            <article
                                className="cart-page-item"
                                key={item.variantKey}
                            >
                                <img src={item.image} alt={item.name} />

                                <div className="cart-page-item-info">
                                    <h3>{item.name}</h3>

                                    {item.brand && (
                                        <p className="cart-item-brand">
                                            {item.brand}
                                        </p>
                                    )}

                                    <div className="cart-item-pricing">
                                        {hasOffer && (
                                            <del className="cart-item-old-price">
                                                {originalUnitPrice.toFixed(2)} ر.س
                                            </del>
                                        )}

                                        <strong className="cart-item-price">
                                            {unitPrice.toFixed(2)} ر.س
                                        </strong>
                                    </div>

                                    {hasOffer && (
                                        <div className="cart-item-offer">
                                            <span className="cart-item-offer-name">
                                                🏷️ {item.offerName}
                                            </span>

                                            <span className="cart-item-offer-saving">
                                                وفرت {itemSavings.toFixed(2)} ر.س
                                            </span>
                                        </div>
                                    )}

                                    {(item.selectedColor || item.selectedSize) && (
                                        <div className="cart-item-options">
                                            {item.selectedColor && (
                                                <span>
                                                    اللون:{' '}
                                                    <strong>
                                                        {item.selectedColor.value}
                                                    </strong>
                                                </span>
                                            )}

                                            {item.selectedSize && (
                                                <span>
                                                    المقاس:{' '}
                                                    <strong>
                                                        {item.selectedSize.value}
                                                    </strong>
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="quantity-controls">
                                        <button
                                            onClick={() =>
                                                updateQuantity(
                                                    item.id,
                                                    -1,
                                                    item.variantKey
                                                )
                                            }
                                        >
                                            −
                                        </button>

                                        <span>{item.quantity}</span>

                                        <button
                                            disabled={
                                                availableStock !== undefined &&
                                                item.quantity >= availableStock
                                            }
                                            onClick={() =>
                                                updateQuantity(
                                                    item.id,
                                                    1,
                                                    item.variantKey
                                                )
                                            }
                                        >
                                            +
                                        </button>
                                    </div>

                                    {availableStock !== undefined && (
                                        <p className="cart-stock-info">
                                            المتوفر: {availableStock} قطعة
                                        </p>
                                    )}

                                    <button
                                        className="remove-item"
                                        onClick={() =>
                                            removeFromCart(
                                                item.id,
                                                item.variantKey
                                            )
                                        }
                                    >
                                        حذف المنتج
                                    </button>
                                </div>

                                <div className="cart-item-subtotal-wrapper">
                                    {hasOffer && (
                                        <del className="cart-item-old-subtotal">
                                            {originalItemTotal.toFixed(2)} ر.س
                                        </del>
                                    )}

                                    <strong className="cart-item-subtotal">
                                        {itemTotal.toFixed(2)} ر.س
                                    </strong>
                                </div>
                            </article>
                        )
                    })}
                </section>

                <aside className="cart-summary">
                    <h2>ملخص الطلب</h2>

                    <div className="checkout-price-row">
                        <span>مجموع المنتجات قبل الخصم</span>
                        <strong>
                            {cartOriginalTotal.toFixed(2)} ر.س
                        </strong>
                    </div>

                    {cartOfferDiscount > 0 && (
                        <div className="checkout-price-row cart-savings-row">
                            <span>توفير عروض المنتجات</span>
                            <strong className="cart-savings-value">
                                -{cartOfferDiscount.toFixed(2)} ر.س
                            </strong>
                        </div>
                    )}

                    <div className="checkout-price-row">
                        <span>مجموع المنتجات بعد عروض المنتجات</span>
                        <strong>{cartTotal.toFixed(2)} ر.س</strong>
                    </div>

                    {/* قسم الكوبون */}
                    <div className="cart-coupon-section">
                        <h3>هل لديك كود خصم؟</h3>

                        {appliedCoupon ? (
                            <div className="cart-applied-coupon">
                                <div>
                                    <strong>
                                        <span>🏷️</span> {appliedCoupon.code}
                                    </strong>

                                    <p>{appliedCoupon.name}</p>

                                    <span className="cart-coupon-discount">
                                        خصم {couponDiscount.toFixed(2)} ر.س
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleRemoveCoupon}
                                    disabled={couponLoading}
                                >
                                    إزالة
                                </button>
                            </div>
                        ) : (
                            <div className="cart-coupon-input">
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(event) =>
                                        setCouponCode(event.target.value)
                                    }
                                    placeholder="أدخل كود الخصم"
                                    disabled={couponLoading}
                                />

                                <button
                                    type="button"
                                    onClick={handleApplyCoupon}
                                    disabled={couponLoading}
                                >
                                    {couponLoading ? 'جارٍ التحقق...' : 'تطبيق'}
                                </button>
                            </div>
                        )}

                        {couponError && (
                            <p className="cart-coupon-error">
                                {couponError}
                            </p>
                        )}

                        {couponSuccess && !couponError && (
                            <p className="cart-coupon-success">
                                {couponSuccess}
                            </p>
                        )}
                    </div>

                    {couponDiscount > 0 && (
                        <div className="checkout-price-row cart-coupon-saving-row">
                            <span>خصم الكوبون ({appliedCoupon?.code})</span>
                            <strong>
                                -{couponDiscount.toFixed(2)} ر.س
                            </strong>
                        </div>
                    )}

                    <div className="checkout-price-row">
                        <span>مجموع المنتجات بعد جميع الخصومات</span>
                        <strong>
                            {subtotalAfterCoupon.toFixed(2)} ر.س
                        </strong>
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

                    <hr />

                    <div className="cart-total">
                        <span>الإجمالي النهائي</span>
                        <strong>{finalTotal.toFixed(2)} ر.س</strong>
                    </div>

                    {shippingFee > 0 ? (
                        <p className="shipping-notice">
                            أضف{' '}
                            {(FREE_SHIPPING_LIMIT - cartTotal).toFixed(2)} ر.س
                            لتحصل على شحن مجاني!
                        </p>
                    ) : (
                        <p className="shipping-notice shipping-success">
                            مبروك! حصلت على شحن مجاني 🎉
                        </p>
                    )}

                    <button onClick={() => navigate('/checkout')}>
                        متابعة إتمام الطلب
                    </button>

                    <button
                        className="continue-shopping"
                        onClick={() => navigate('/')}
                    >
                        متابعة التسوق
                    </button>
                </aside>
            </div>
        </main>
    )
}

export default CartPage
