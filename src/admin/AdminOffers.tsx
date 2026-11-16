
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import type { Product } from '../context/store-context'

import {
    addOffer,
    deleteOffer,
    getAdminOffers,
    toggleOfferStatus,
    updateOffer,
} from './services/offerService'

import type {
    Offer,
    OfferInput,
} from './services/offerService'

import {
    addCoupon,
    deleteCoupon,
    getAdminCoupons,
    toggleCouponStatus,
    updateCoupon,
    normalizeCouponCode,
} from './services/couponService'

import type {
    Coupon,
    CouponInput,
    CouponAudience,
} from './services/couponService'

import {
    getAdminCustomers,
} from './services/customerService'

import type {
    AdminCustomer,
} from './services/customerService'

import {
    getPublishedProducts,
} from './services/productService'

// =====================================
// أنواع مساعدة
// =====================================

type OfferStatus = 'active' | 'scheduled' | 'expired' | 'stopped'

type CouponStatus = 'active' | 'scheduled' | 'expired' | 'stopped' | 'used'

type MainTab = 'offers' | 'coupons'

// =====================================
// أدوات التاريخ
// =====================================

function toDateTimeLocal(date: Date) {
    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    )

    return localDate.toISOString().slice(0, 16)
}

function formatDate(date?: Date) {
    if (!date) return '—'

    return date.toLocaleString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function getDefaultDates() {
    const now = new Date()
    const later = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    return {
        startsAt: toDateTimeLocal(now),
        endsAt: toDateTimeLocal(later),
    }
}

// =====================================
// حالات العروض
// =====================================

function getOfferStatus(offer: Offer): OfferStatus {
    if (!offer.isActive) return 'stopped'

    const now = Date.now()

    if (now < offer.startsAt.toMillis()) return 'scheduled'
    if (now >= offer.endsAt.toMillis()) return 'expired'

    return 'active'
}

function getStatusLabel(status: OfferStatus | CouponStatus) {
    const labels: Record<OfferStatus | CouponStatus, string> = {
        active: 'نشط',
        scheduled: 'مجدول',
        expired: 'منتهي',
        stopped: 'متوقف',
        used: 'مكتمل الاستخدام',
    }

    return labels[status]
}

function getCouponStatus(coupon: Coupon): CouponStatus {
    if (!coupon.isActive) return 'stopped'

    const now = Date.now()

    if (now < coupon.startsAt.toMillis()) return 'scheduled'
    if (now >= coupon.endsAt.toMillis()) return 'expired'

    if (
        coupon.maxUses !== null &&
        coupon.usageCount >= coupon.maxUses
    ) {
        return 'used'
    }

    return 'active'
}

// =====================================
// أدوات الخصم
// =====================================

function getOfferDiscountText(offer: Offer) {
    return offer.discountType === 'percentage'
        ? `${offer.discountValue}%`
        : `${offer.discountValue.toLocaleString('ar-SA')} ر.س`
}

function getCouponDiscountText(coupon: Coupon) {
    return coupon.discountType === 'percentage'
        ? `${coupon.discountValue}%`
        : `${coupon.discountValue.toLocaleString('ar-SA')} ر.س`
}

function getAudienceLabel(audience: CouponAudience) {
    const labels: Record<CouponAudience, string> = {
        all: 'جميع العملاء',
        new: 'العملاء الجدد',
        customer: 'عميل محدد',
    }

    return labels[audience]
}

function getCouponUsageText(coupon: Coupon) {
    return coupon.maxUses === null
        ? `${coupon.usageCount} استخدام`
        : `${coupon.usageCount} / ${coupon.maxUses}`
}

// =====================================
// الصفحة
// =====================================

function AdminOffers() {
    const [activeTab, setActiveTab] = useState<MainTab>('offers')

    const [offers, setOffers] = useState<Offer[]>([])
    const [coupons, setCoupons] = useState<Coupon[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [customers, setCustomers] = useState<AdminCustomer[]>([])

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // =====================================
    // نموذج العرض
    // =====================================

    const [offerModalOpen, setOfferModalOpen] = useState(false)
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null)

    const [name, setName] = useState('')
    const [discountType, setDiscountType] =
        useState<'percentage' | 'fixed'>('percentage')
    const [discountValue, setDiscountValue] = useState('')
    const [productIds, setProductIds] = useState<number[]>([])
    const [startsAt, setStartsAt] = useState('')
    const [endsAt, setEndsAt] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [search, setSearch] = useState('')

    // =====================================
    // نموذج الكوبون
    // =====================================

    const [couponModalOpen, setCouponModalOpen] = useState(false)
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)

    const [couponCode, setCouponCode] = useState('')
    const [couponName, setCouponName] = useState('')

    const [couponDiscountType, setCouponDiscountType] =
        useState<'percentage' | 'fixed'>('percentage')

    const [couponDiscountValue, setCouponDiscountValue] = useState('')
    const [minOrderAmount, setMinOrderAmount] = useState('')
    const [maxDiscountAmount, setMaxDiscountAmount] = useState('')

    const [audience, setAudience] = useState<CouponAudience>('all')

    const [selectedCustomerId, setSelectedCustomerId] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)

    const [maxUses, setMaxUses] = useState('')
    const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState('1')

    const [couponStartsAt, setCouponStartsAt] = useState('')
    const [couponEndsAt, setCouponEndsAt] = useState('')
    const [couponIsActive, setCouponIsActive] = useState(true)

    // =====================================
    // تحميل البيانات
    // =====================================

    async function fetchData() {
        const [
            offersData,
            couponsData,
            productsData,
            customersData,
        ] = await Promise.all([
            getAdminOffers(),
            getAdminCoupons(),
            getPublishedProducts(),
            getAdminCustomers(),
        ])

        return {
            offers: offersData,
            coupons: couponsData,
            products: productsData,
            customers: customersData,
        }
    }

    async function loadData() {
        try {
            setLoading(true)
            setError('')

            const data = await fetchData()

            setOffers(data.offers)
            setCoupons(data.coupons)
            setProducts(data.products)
            setCustomers(data.customers)
        } catch (err) {
            console.error(err)
            setError('تعذر تحميل بيانات العروض والكوبونات')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let cancelled = false

        fetchData()
            .then((data) => {
                if (cancelled) return

                setOffers(data.offers)
                setCoupons(data.coupons)
                setProducts(data.products)
                setCustomers(data.customers)
                setLoading(false)
            })
            .catch((err) => {
                if (cancelled) return

                console.error(err)
                setError('تعذر تحميل بيانات العروض والكوبونات')
                setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [])

    // =====================================
    // إحصائيات العروض
    // =====================================

    const offerStatistics = useMemo(() => {
        const result = {
            active: 0,
            scheduled: 0,
            expired: 0,
            stopped: 0,
        }

        offers.forEach((offer) => {
            result[getOfferStatus(offer)]++
        })

        return result
    }, [offers])

    // =====================================
    // إحصائيات الكوبونات
    // =====================================

    const couponStatistics = useMemo(() => {
        const result = {
            active: 0,
            scheduled: 0,
            expired: 0,
            stopped: 0,
            used: 0,
        }

        coupons.forEach((coupon) => {
            result[getCouponStatus(coupon)]++
        })

        return result
    }, [coupons])

    // =====================================
    // البحث عن المنتجات
    // =====================================

    const filteredProducts = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase()

        if (!normalizedSearch) return products

        return products.filter((product) =>
            product.name.toLowerCase().includes(normalizedSearch)
        )
    }, [products, search])

    // =====================================
    // البحث عن العملاء
    // =====================================

    const filteredCustomers = useMemo(() => {
        const normalizedSearch = customerSearch.trim().toLowerCase()

        if (!normalizedSearch) return customers.slice(0, 8)

        return customers
            .filter((customer) => {
                const nameMatch = customer.name
                    ?.toLowerCase()
                    .includes(normalizedSearch)

                const phoneMatch = customer.phone
                    ?.replace(/\D/g, '')
                    .includes(normalizedSearch.replace(/\D/g, ''))

                return nameMatch || phoneMatch
            })
            .slice(0, 8)
    }, [customers, customerSearch])

    const selectedCustomer = useMemo(
        () => customers.find(
            (customer) => customer.uid === selectedCustomerId
        ) ?? null,
        [customers, selectedCustomerId]
    )

    // =====================================
    // إعادة ضبط نموذج العرض
    // =====================================

    function resetOfferForm() {
        setName('')
        setDiscountType('percentage')
        setDiscountValue('')
        setProductIds([])

        const dates = getDefaultDates()

        setStartsAt(dates.startsAt)
        setEndsAt(dates.endsAt)

        setIsActive(true)
        setSearch('')
        setEditingOffer(null)
        setError('')
    }

    function openAddOfferModal() {
        resetOfferForm()
        setOfferModalOpen(true)
    }

    function openEditOfferModal(offer: Offer) {
        setEditingOffer(offer)

        setName(offer.name)
        setDiscountType(offer.discountType)
        setDiscountValue(String(offer.discountValue))
        setProductIds(offer.productIds ?? [])

        setStartsAt(toDateTimeLocal(offer.startsAt.toDate()))
        setEndsAt(toDateTimeLocal(offer.endsAt.toDate()))

        setIsActive(offer.isActive)

        setSearch('')
        setError('')
        setOfferModalOpen(true)
    }

    function closeOfferModal() {
        if (saving) return

        setOfferModalOpen(false)
        resetOfferForm()
    }

    // =====================================
    // اختيار المنتجات
    // =====================================

    function toggleProduct(productId: number) {
        setProductIds((current) =>
            current.includes(productId)
                ? current.filter((id) => id !== productId)
                : [...current, productId]
        )
    }

    function toggleAllVisibleProducts() {
        const visibleIds = filteredProducts.map(
            (product) => product.id
        )

        const allSelected = visibleIds.every((id) =>
            productIds.includes(id)
        )

        if (allSelected) {
            setProductIds((current) =>
                current.filter((id) => !visibleIds.includes(id))
            )
        } else {
            setProductIds((current) =>
                [...new Set([...current, ...visibleIds])]
            )
        }
    }

    // =====================================
    // حفظ العرض
    // =====================================

    async function handleOfferSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setError('')
        setSuccess('')

        const value = Number(discountValue)

        if (!name.trim()) {
            setError('يرجى إدخال اسم العرض')
            return
        }

        if (!Number.isFinite(value) || value <= 0) {
            setError('يرجى إدخال قيمة خصم صحيحة')
            return
        }

        if (discountType === 'percentage' && value > 100) {
            setError('نسبة الخصم لا يمكن أن تتجاوز 100%')
            return
        }

        if (productIds.length === 0) {
            setError('يرجى اختيار منتج واحد على الأقل')
            return
        }

        if (!startsAt || !endsAt) {
            setError('يرجى تحديد بداية العرض ونهايته')
            return
        }

        const startDate = new Date(startsAt)
        const endDate = new Date(endsAt)

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            endDate <= startDate
        ) {
            setError('يرجى التأكد من صحة تاريخ البداية والنهاية')
            return
        }

        const offerData: OfferInput = {
            name: name.trim(),
            type: 'product',
            discountType,
            discountValue: value,
            productIds,
            startsAt: startDate,
            endsAt: endDate,
            isActive,
        }

        try {
            setSaving(true)

            if (editingOffer) {
                await updateOffer(editingOffer.id, offerData)
                setSuccess('تم تحديث العرض بنجاح')
            } else {
                await addOffer(offerData)
                setSuccess('تم إنشاء العرض بنجاح')
            }

            setOfferModalOpen(false)
            resetOfferForm()

            await loadData()
        } catch (err) {
            console.error(err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'حدث خطأ أثناء حفظ العرض'
            )
        } finally {
            setSaving(false)
        }
    }

    // =====================================
    // تفعيل وإيقاف العرض
    // =====================================

    async function handleToggleOffer(offer: Offer) {
        try {
            setError('')
            setSuccess('')

            await toggleOfferStatus(offer.id, !offer.isActive)

            setSuccess(
                offer.isActive
                    ? 'تم إيقاف العرض'
                    : 'تم تفعيل العرض'
            )

            await loadData()
        } catch (err) {
            console.error(err)
            setError('تعذر تغيير حالة العرض')
        }
    }

    // =====================================
    // حذف العرض
    // =====================================

    async function handleDeleteOffer(offer: Offer) {
        const confirmed = window.confirm(
            `هل أنت متأكد من حذف العرض "${offer.name}"؟`
        )

        if (!confirmed) return

        try {
            setError('')
            setSuccess('')

            await deleteOffer(offer.id)

            setSuccess('تم حذف العرض بنجاح')

            await loadData()
        } catch (err) {
            console.error(err)
            setError('تعذر حذف العرض')
        }
    }

    // =====================================
    // إعادة ضبط نموذج الكوبون
    // =====================================

    function resetCouponForm() {
        const dates = getDefaultDates()

        setCouponCode('')
        setCouponName('')

        setCouponDiscountType('percentage')
        setCouponDiscountValue('')

        setMinOrderAmount('')
        setMaxDiscountAmount('')

        setAudience('all')

        setSelectedCustomerId('')
        setCustomerSearch('')
        setCustomerDropdownOpen(false)

        setMaxUses('')
        setMaxUsesPerCustomer('1')

        setCouponStartsAt(dates.startsAt)
        setCouponEndsAt(dates.endsAt)

        setCouponIsActive(true)

        setEditingCoupon(null)
        setError('')
    }

    function openAddCouponModal() {
        resetCouponForm()
        setCouponModalOpen(true)
    }

    function openEditCouponModal(coupon: Coupon) {
        setEditingCoupon(coupon)

        setCouponCode(coupon.code)
        setCouponName(coupon.name)

        setCouponDiscountType(coupon.discountType)
        setCouponDiscountValue(String(coupon.discountValue))

        setMinOrderAmount(String(coupon.minOrderAmount ?? 0))

        setMaxDiscountAmount(
            coupon.maxDiscountAmount === null
                ? ''
                : String(coupon.maxDiscountAmount)
        )

        setAudience(coupon.audience)

        setSelectedCustomerId(coupon.customerId ?? '')
        setCustomerSearch(coupon.customerName ?? '')
        setCustomerDropdownOpen(false)

        setMaxUses(
            coupon.maxUses === null
                ? ''
                : String(coupon.maxUses)
        )

        setMaxUsesPerCustomer(
            coupon.maxUsesPerCustomer === null
                ? ''
                : String(coupon.maxUsesPerCustomer)
        )

        setCouponStartsAt(
            toDateTimeLocal(coupon.startsAt.toDate())
        )

        setCouponEndsAt(
            toDateTimeLocal(coupon.endsAt.toDate())
        )

        setCouponIsActive(coupon.isActive)

        setError('')
        setCouponModalOpen(true)
    }

    function closeCouponModal() {
        if (saving) return

        setCouponModalOpen(false)
        resetCouponForm()
    }

    // =====================================
    // اختيار العميل
    // =====================================

    function selectCustomer(customer: AdminCustomer) {
        setSelectedCustomerId(customer.uid)
        setCustomerSearch(customer.name || customer.phone || '')
        setCustomerDropdownOpen(false)
    }

    function changeAudience(value: CouponAudience) {
        setAudience(value)

        if (value !== 'customer') {
            setSelectedCustomerId('')
            setCustomerSearch('')
            setCustomerDropdownOpen(false)
        }
    }

    // =====================================
    // حفظ الكوبون
    // =====================================

    async function handleCouponSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setError('')
        setSuccess('')

        const value = Number(couponDiscountValue)
        const minimum = Number(minOrderAmount || 0)

        const maximumDiscount = maxDiscountAmount.trim()
            ? Number(maxDiscountAmount)
            : null

        const maximumUses = maxUses.trim()
            ? Number(maxUses)
            : null

        const perCustomer = maxUsesPerCustomer.trim()
            ? Number(maxUsesPerCustomer)
            : null

        if (!couponCode.trim()) {
            setError('يرجى إدخال كود الكوبون')
            return
        }

        if (!couponName.trim()) {
            setError('يرجى إدخال اسم الكوبون')
            return
        }

        if (!Number.isFinite(value) || value <= 0) {
            setError('يرجى إدخال قيمة خصم صحيحة')
            return
        }

        if (couponDiscountType === 'percentage' && value > 100) {
            setError('نسبة الخصم لا يمكن أن تتجاوز 100%')
            return
        }

        if (!Number.isFinite(minimum) || minimum < 0) {
            setError('الحد الأدنى للطلب غير صحيح')
            return
        }

        if (
            maximumDiscount !== null &&
            (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)
        ) {
            setError('الحد الأقصى للخصم غير صحيح')
            return
        }

        if (
            maximumUses !== null &&
            (!Number.isSafeInteger(maximumUses) || maximumUses <= 0)
        ) {
            setError('عدد مرات الاستخدام غير صحيح')
            return
        }

        if (
            perCustomer !== null &&
            (!Number.isSafeInteger(perCustomer) || perCustomer <= 0)
        ) {
            setError('عدد مرات الاستخدام لكل عميل غير صحيح')
            return
        }

        if (audience === 'customer' && !selectedCustomer) {
            setError('يرجى اختيار العميل المستفيد من الكوبون')
            return
        }

        if (!couponStartsAt || !couponEndsAt) {
            setError('يرجى تحديد تاريخ بداية الكوبون ونهايته')
            return
        }

        const startDate = new Date(couponStartsAt)
        const endDate = new Date(couponEndsAt)

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            endDate <= startDate
        ) {
            setError('يرجى التأكد من صحة تاريخ البداية والنهاية')
            return
        }

        const couponData: CouponInput = {
            code: normalizeCouponCode(couponCode),
            name: couponName.trim(),

            discountType: couponDiscountType,
            discountValue: value,

            minOrderAmount: minimum,
            maxDiscountAmount: maximumDiscount,

            audience,

            customerId: audience === 'customer'
                ? selectedCustomer?.uid ?? null
                : null,

            customerName: audience === 'customer'
                ? selectedCustomer?.name ?? null
                : null,

            customerPhone: audience === 'customer'
                ? selectedCustomer?.phone ?? null
                : null,

            maxUses: maximumUses,
            maxUsesPerCustomer: perCustomer,

            startsAt: startDate,
            endsAt: endDate,

            isActive: couponIsActive,
        }

        try {
            setSaving(true)

            if (editingCoupon) {
                await updateCoupon(editingCoupon.id, couponData)
                setSuccess('تم تحديث الكوبون بنجاح')
            } else {
                await addCoupon(couponData)
                setSuccess('تم إنشاء الكوبون بنجاح')
            }

            setCouponModalOpen(false)
            resetCouponForm()

            await loadData()
        } catch (err) {
            console.error(err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'حدث خطأ أثناء حفظ الكوبون'
            )
        } finally {
            setSaving(false)
        }
    }

    // =====================================
    // تفعيل وإيقاف الكوبون
    // =====================================

    async function handleToggleCoupon(coupon: Coupon) {
        try {
            setError('')
            setSuccess('')

            await toggleCouponStatus(
                coupon.id,
                !coupon.isActive
            )

            setSuccess(
                coupon.isActive
                    ? 'تم إيقاف الكوبون'
                    : 'تم تفعيل الكوبون'
            )

            await loadData()
        } catch (err) {
            console.error(err)
            setError('تعذر تغيير حالة الكوبون')
        }
    }

    // =====================================
    // حذف الكوبون
    // =====================================

    async function handleDeleteCoupon(coupon: Coupon) {
        const confirmed = window.confirm(
            `هل أنت متأكد من حذف الكوبون "${coupon.code}"؟`
        )

        if (!confirmed) return

        try {
            setError('')
            setSuccess('')

            await deleteCoupon(coupon.id)

            setSuccess('تم حذف الكوبون بنجاح')

            await loadData()
        } catch (err) {
            console.error(err)
            setError('تعذر حذف الكوبون')
        }
    }

    // =====================================
    // الواجهة
    // =====================================

    return (
        <div className="ao-page">

            <div className="ao-header">
                <div>
                    <span className="ao-eyebrow">إدارة التسويق</span>
                    <h1>العروض والخصومات</h1>
                    <p>إدارة العروض الترويجية وكوبونات الخصم</p>
                </div>

                <button
                    type="button"
                    className="ao-primary-button"
                    onClick={
                        activeTab === 'offers'
                            ? openAddOfferModal
                            : openAddCouponModal
                    }
                >
                    <span>＋</span>
                    {activeTab === 'offers'
                        ? 'إضافة عرض جديد'
                        : 'إنشاء كوبون جديد'}
                </button>
            </div>

            {error && !offerModalOpen && !couponModalOpen && (
                <div className="ao-alert ao-alert-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="ao-alert ao-alert-success">
                    {success}
                    <button
                        type="button"
                        onClick={() => setSuccess('')}
                        aria-label="إغلاق"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* =====================================
                التبويبات
            ===================================== */}

            <div className="ao-tabs">
                <button
                    type="button"
                    className={activeTab === 'offers' ? 'active' : ''}
                    onClick={() => {
                        setActiveTab('offers')
                        setError('')
                        setSuccess('')
                    }}
                >
                    <span>🏷️</span>
                    عروض المنتجات
                    <small>{offers.length}</small>
                </button>

                <button
                    type="button"
                    className={activeTab === 'coupons' ? 'active' : ''}
                    onClick={() => {
                        setActiveTab('coupons')
                        setError('')
                        setSuccess('')
                    }}
                >
                    <span>🎟️</span>
                    كوبونات الخصم
                    <small>{coupons.length}</small>
                </button>
            </div>

            {loading ? (
                <div className="ao-loading">
                    جاري تحميل البيانات...
                </div>
            ) : activeTab === 'offers' ? (

                // =====================================
                // تبويب عروض المنتجات
                // =====================================

                <>
                    <div className="ao-stats">

                        <div className="ao-stat-card">
                            <span className="ao-stat-icon ao-green">✓</span>
                            <div>
                                <small>العروض النشطة</small>
                                <strong>{offerStatistics.active}</strong>
                            </div>
                        </div>

                        <div className="ao-stat-card">
                            <span className="ao-stat-icon ao-blue">◷</span>
                            <div>
                                <small>العروض المجدولة</small>
                                <strong>{offerStatistics.scheduled}</strong>
                            </div>
                        </div>

                        <div className="ao-stat-card">
                            <span className="ao-stat-icon ao-orange">⌛</span>
                            <div>
                                <small>العروض المنتهية</small>
                                <strong>{offerStatistics.expired}</strong>
                            </div>
                        </div>

                        <div className="ao-stat-card">
                            <span className="ao-stat-icon ao-gray">Ⅱ</span>
                            <div>
                                <small>العروض المتوقفة</small>
                                <strong>{offerStatistics.stopped}</strong>
                            </div>
                        </div>

                    </div>

                    <section className="ao-section">

                        <div className="ao-section-heading">
                            <div>
                                <h2>جميع العروض</h2>
                                <p>إدارة ومتابعة العروض الترويجية</p>
                            </div>

                            <span className="ao-count">
                                {offers.length} عرض
                            </span>
                        </div>

                        {offers.length === 0 ? (
                            <div className="ao-empty">
                                <span>🏷️</span>
                                <h3>لا توجد عروض حتى الآن</h3>
                                <p>ابدأ بإنشاء أول عرض ترويجي لمتجرك</p>

                                <button
                                    type="button"
                                    className="ao-primary-button"
                                    onClick={openAddOfferModal}
                                >
                                    إضافة أول عرض
                                </button>
                            </div>
                        ) : (
                            <div className="ao-table-wrapper">
                                <table className="ao-table">
                                    <thead>
                                        <tr>
                                            <th>اسم العرض</th>
                                            <th>الخصم</th>
                                            <th>المنتجات</th>
                                            <th>بداية العرض</th>
                                            <th>نهاية العرض</th>
                                            <th>الحالة</th>
                                            <th>الإجراءات</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {offers.map((offer) => {
                                            const status = getOfferStatus(offer)

                                            return (
                                                <tr key={offer.id}>
                                                    <td>
                                                        <strong className="ao-offer-name">
                                                            {offer.name}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <span className="ao-discount-value">
                                                            {getOfferDiscountText(offer)}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {offer.productIds?.length ?? 0} منتج
                                                    </td>

                                                    <td>
                                                        {formatDate(offer.startsAt.toDate())}
                                                    </td>

                                                    <td>
                                                        {formatDate(offer.endsAt.toDate())}
                                                    </td>

                                                    <td>
                                                        <span className={`ao-status ao-status-${status}`}>
                                                            {getStatusLabel(status)}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="ao-actions">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditOfferModal(offer)}
                                                            >
                                                                تعديل
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => void handleToggleOffer(offer)}
                                                            >
                                                                {offer.isActive ? 'إيقاف' : 'تفعيل'}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="ao-delete-button"
                                                                onClick={() => void handleDeleteOffer(offer)}
                                                            >
                                                                حذف
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </section>
                </>

            ) : (

                // =====================================
                // تبويب الكوبونات
                // =====================================

                <>
                    <div className="ao-stats">

                        <div className="ao-stat-card">
                            <span className="ao-stat-icon ao-green">✓</span>
                            <div>
                                <small>الكوبونات النشطة</small>
                                <strong>{couponStatistics.active}</strong>
                            </div>
                        </div>

                        <div className="ao-stat-card">
                            <span className="ao-stat-icon ao-blue">◷</span>
                            <div>
                                <small>المجدولة</small>
                                <strong>{couponStatistics.scheduled}</strong>
                            </div>
                        </div>

                        <div className="ao-stat-card">
                            <span className="ao-stat-icon ao-orange">⌛</span>
                            <div>
                                <small>المنتهية</small>
                                <strong>{couponStatistics.expired}</strong>
                            </div>
                        </div>

                        <div className="ao-stat-card">
                            <span className="ao-stat-icon ao-gray">Ⅱ</span>
                            <div>
                                <small>المتوقفة</small>
                                <strong>{couponStatistics.stopped}</strong>
                            </div>
                        </div>

                    </div>

                    <section className="ao-section">

                        <div className="ao-section-heading">
                            <div>
                                <h2>كوبونات الخصم</h2>
                                <p>أنشئ أكواد خصم بشروط مختلفة وحدد العملاء المستفيدين</p>
                            </div>

                            <span className="ao-count">
                                {coupons.length} كوبون
                            </span>
                        </div>

                        {coupons.length === 0 ? (
                            <div className="ao-empty">
                                <span>🎟️</span>
                                <h3>لا توجد كوبونات حتى الآن</h3>
                                <p>أنشئ أول كوبون خصم وابدأ حملاتك التسويقية</p>

                                <button
                                    type="button"
                                    className="ao-primary-button"
                                    onClick={openAddCouponModal}
                                >
                                    إنشاء أول كوبون
                                </button>
                            </div>
                        ) : (
                            <div className="ao-table-wrapper">
                                <table className="ao-table">
                                    <thead>
                                        <tr>
                                            <th>الكوبون</th>
                                            <th>قيمة الخصم</th>
                                            <th>المستفيدون</th>
                                            <th>الاستخدام</th>
                                            <th>تاريخ الانتهاء</th>
                                            <th>الحالة</th>
                                            <th>الإجراءات</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {coupons.map((coupon) => {
                                            const status = getCouponStatus(coupon)

                                            return (
                                                <tr key={coupon.id}>
                                                    <td>
                                                        <div className="ac-code-cell">
                                                            <strong>{coupon.code}</strong>
                                                            <small>{coupon.name}</small>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span className="ao-discount-value">
                                                            {getCouponDiscountText(coupon)}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="ac-audience-cell">
                                                            <strong>
                                                                {getAudienceLabel(coupon.audience)}
                                                            </strong>

                                                            {coupon.audience === 'customer' && (
                                                                <small>
                                                                    {coupon.customerName || coupon.customerPhone || 'عميل محدد'}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {getCouponUsageText(coupon)}
                                                    </td>

                                                    <td>
                                                        {formatDate(coupon.endsAt.toDate())}
                                                    </td>

                                                    <td>
                                                        <span className={`ao-status ao-status-${status}`}>
                                                            {getStatusLabel(status)}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="ao-actions">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditCouponModal(coupon)}
                                                            >
                                                                تعديل
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => void handleToggleCoupon(coupon)}
                                                            >
                                                                {coupon.isActive ? 'إيقاف' : 'تفعيل'}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="ao-delete-button"
                                                                onClick={() => void handleDeleteCoupon(coupon)}
                                                            >
                                                                حذف
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </section>
                </>
            )}

            {/* =====================================
                نافذة العرض
            ===================================== */}

            {offerModalOpen && (
                <div
                    className="ao-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeOfferModal()
                        }
                    }}
                >
                    <section className="ao-modal">

                        <div className="ao-modal-header">
                            <div>
                                <h2>
                                    {editingOffer ? 'تعديل العرض' : 'إضافة عرض جديد'}
                                </h2>
                                <p>أدخل تفاصيل العرض والمنتجات المستهدفة</p>
                            </div>

                            <button
                                type="button"
                                className="ao-close-button"
                                onClick={closeOfferModal}
                                disabled={saving}
                                aria-label="إغلاق"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleOfferSubmit}>
                            <div className="ao-form-body">

                                <div className="ao-form-group">
                                    <label htmlFor="ao-name">اسم العرض</label>

                                    <input
                                        id="ao-name"
                                        type="text"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder="مثال: عروض الجمعة البيضاء"
                                        maxLength={80}
                                        required
                                    />
                                </div>

                                <div className="ao-form-row">
                                    <div className="ao-form-group">
                                        <label htmlFor="ao-discount-type">نوع الخصم</label>

                                        <select
                                            id="ao-discount-type"
                                            value={discountType}
                                            onChange={(event) =>
                                                setDiscountType(
                                                    event.target.value as 'percentage' | 'fixed'
                                                )
                                            }
                                        >
                                            <option value="percentage">نسبة مئوية</option>
                                            <option value="fixed">مبلغ ثابت</option>
                                        </select>
                                    </div>

                                    <div className="ao-form-group">
                                        <label htmlFor="ao-discount-value">قيمة الخصم</label>

                                        <div className="ao-value-input">
                                            <input
                                                id="ao-discount-value"
                                                type="number"
                                                min="0.01"
                                                max={discountType === 'percentage' ? 100 : undefined}
                                                step="0.01"
                                                value={discountValue}
                                                onChange={(event) => setDiscountValue(event.target.value)}
                                                placeholder="0"
                                                required
                                            />

                                            <span>
                                                {discountType === 'percentage' ? '%' : 'ر.س'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ao-form-row">
                                    <div className="ao-form-group">
                                        <label htmlFor="ao-start">تاريخ بداية العرض</label>

                                        <input
                                            id="ao-start"
                                            type="datetime-local"
                                            value={startsAt}
                                            onChange={(event) => setStartsAt(event.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="ao-form-group">
                                        <label htmlFor="ao-end">تاريخ نهاية العرض</label>

                                        <input
                                            id="ao-end"
                                            type="datetime-local"
                                            value={endsAt}
                                            onChange={(event) => setEndsAt(event.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="ao-products-picker">
                                    <div className="ao-products-heading">
                                        <div>
                                            <h3>المنتجات المشمولة بالعرض</h3>
                                            <p>تم اختيار {productIds.length} منتج</p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={toggleAllVisibleProducts}
                                            disabled={filteredProducts.length === 0}
                                        >
                                            {filteredProducts.length > 0 &&
                                                filteredProducts.every((product) =>
                                                    productIds.includes(product.id)
                                                )
                                                ? 'إلغاء تحديد الظاهر'
                                                : 'تحديد الكل الظاهر'}
                                        </button>
                                    </div>

                                    <input
                                        className="ao-product-search"
                                        type="search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="ابحث عن منتج..."
                                    />

                                    {products.length === 0 ? (
                                        <div className="ao-no-products">
                                            لا توجد منتجات منشورة متاحة للاختيار
                                        </div>
                                    ) : filteredProducts.length === 0 ? (
                                        <div className="ao-no-products">
                                            لا توجد منتجات تطابق البحث
                                        </div>
                                    ) : (
                                        <div className="ao-products-list">
                                            {filteredProducts.map((product) => {
                                                const selected = productIds.includes(product.id)

                                                return (
                                                    <label
                                                        key={product.id}
                                                        className={`ao-product-option ${selected ? 'selected' : ''}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => toggleProduct(product.id)}
                                                        />

                                                        {product.image ? (
                                                            <img src={product.image} alt="" />
                                                        ) : (
                                                            <span className="ao-product-placeholder">
                                                                📦
                                                            </span>
                                                        )}

                                                        <span className="ao-product-details">
                                                            <strong>{product.name}</strong>
                                                            <small>
                                                                {product.price.toLocaleString('ar-SA')} ر.س
                                                            </small>
                                                        </span>

                                                        <span className="ao-product-check">
                                                            {selected ? '✓' : ''}
                                                        </span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                <label className="ao-active-toggle">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(event) => setIsActive(event.target.checked)}
                                    />

                                    <span>
                                        <strong>تفعيل العرض</strong>
                                        <small>سيتم عرض الخصم عندما يحين موعد البداية</small>
                                    </span>
                                </label>

                                {error && (
                                    <div className="ao-alert ao-alert-error">{error}</div>
                                )}
                            </div>

                            <div className="ao-modal-footer">
                                <button
                                    type="button"
                                    className="ao-cancel-button"
                                    onClick={closeOfferModal}
                                    disabled={saving}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="ao-primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? 'جاري الحفظ...'
                                        : editingOffer
                                            ? 'حفظ التعديلات'
                                            : 'إنشاء العرض'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* =====================================
                نافذة الكوبون
            ===================================== */}

            {couponModalOpen && (
                <div
                    className="ao-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeCouponModal()
                        }
                    }}
                >
                    <section className="ao-modal ac-coupon-modal">

                        <div className="ao-modal-header">
                            <div>
                                <h2>
                                    {editingCoupon ? 'تعديل الكوبون' : 'إنشاء كوبون جديد'}
                                </h2>
                                <p>حدد قيمة الخصم وشروط الاستخدام والعملاء المستفيدين</p>
                            </div>

                            <button
                                type="button"
                                className="ao-close-button"
                                onClick={closeCouponModal}
                                disabled={saving}
                                aria-label="إغلاق"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCouponSubmit}>
                            <div className="ao-form-body">

                                {/* معلومات الكوبون */}

                                <div className="ac-form-section">
                                    <h3>معلومات الكوبون</h3>

                                    <div className="ao-form-row">
                                        <div className="ao-form-group">
                                            <label htmlFor="ac-code">كود الكوبون</label>

                                            <input
                                                id="ac-code"
                                                type="text"
                                                value={couponCode}
                                                onChange={(event) =>
                                                    setCouponCode(
                                                        event.target.value.toUpperCase().replace(/\s/g, '')
                                                    )
                                                }
                                                placeholder="مثال: TREND20"
                                                maxLength={30}
                                                required
                                            />
                                            <small>الحروف الإنجليزية والأرقام والشرطة فقط</small>
                                        </div>

                                        <div className="ao-form-group">
                                            <label htmlFor="ac-name">اسم الكوبون</label>

                                            <input
                                                id="ac-name"
                                                type="text"
                                                value={couponName}
                                                onChange={(event) => setCouponName(event.target.value)}
                                                placeholder="مثال: خصم العملاء الجدد"
                                                maxLength={80}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* إعدادات الخصم */}

                                <div className="ac-form-section">
                                    <h3>إعدادات الخصم</h3>

                                    <div className="ao-form-row">
                                        <div className="ao-form-group">
                                            <label htmlFor="ac-discount-type">نوع الخصم</label>

                                            <select
                                                id="ac-discount-type"
                                                value={couponDiscountType}
                                                onChange={(event) =>
                                                    setCouponDiscountType(
                                                        event.target.value as 'percentage' | 'fixed'
                                                    )
                                                }
                                            >
                                                <option value="percentage">نسبة مئوية</option>
                                                <option value="fixed">مبلغ ثابت</option>
                                            </select>
                                        </div>

                                        <div className="ao-form-group">
                                            <label htmlFor="ac-discount-value">قيمة الخصم</label>

                                            <div className="ao-value-input">
                                                <input
                                                    id="ac-discount-value"
                                                    type="number"
                                                    min="0.01"
                                                    max={couponDiscountType === 'percentage' ? 100 : undefined}
                                                    step="0.01"
                                                    value={couponDiscountValue}
                                                    onChange={(event) =>
                                                        setCouponDiscountValue(event.target.value)
                                                    }
                                                    placeholder="0"
                                                    required
                                                />

                                                <span>
                                                    {couponDiscountType === 'percentage' ? '%' : 'ر.س'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ao-form-row">
                                        <div className="ao-form-group">
                                            <label htmlFor="ac-minimum">الحد الأدنى للطلب</label>

                                            <div className="ao-value-input">
                                                <input
                                                    id="ac-minimum"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={minOrderAmount}
                                                    onChange={(event) => setMinOrderAmount(event.target.value)}
                                                    placeholder="0"
                                                />
                                                <span>ر.س</span>
                                            </div>
                                            <small>اتركه صفرًا إذا لم يكن هناك حد أدنى</small>
                                        </div>

                                        <div className="ao-form-group">
                                            <label htmlFor="ac-maximum-discount">
                                                الحد الأقصى للخصم
                                            </label>

                                            <div className="ao-value-input">
                                                <input
                                                    id="ac-maximum-discount"
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={maxDiscountAmount}
                                                    onChange={(event) =>
                                                        setMaxDiscountAmount(event.target.value)
                                                    }
                                                    placeholder="غير محدود"
                                                />
                                                <span>ر.س</span>
                                            </div>
                                            <small>اختياري، ويستخدم غالبًا مع الخصم النسبي</small>
                                        </div>
                                    </div>
                                </div>

                                {/* المستفيدون */}

                                <div className="ac-form-section">
                                    <h3>من يمكنه استخدام الكوبون؟</h3>

                                    <div className="ac-audience-options">
                                        <label className={audience === 'all' ? 'selected' : ''}>
                                            <input
                                                type="radio"
                                                name="ac-audience"
                                                checked={audience === 'all'}
                                                onChange={() => changeAudience('all')}
                                            />
                                            <span>
                                                <strong>جميع العملاء</strong>
                                                <small>متاح لكل عملاء المتجر</small>
                                            </span>
                                        </label>

                                        <label className={audience === 'new' ? 'selected' : ''}>
                                            <input
                                                type="radio"
                                                name="ac-audience"
                                                checked={audience === 'new'}
                                                onChange={() => changeAudience('new')}
                                            />
                                            <span>
                                                <strong>العملاء الجدد</strong>
                                                <small>العملاء الذين لم يسبق لهم إتمام طلب</small>
                                            </span>
                                        </label>

                                        <label className={audience === 'customer' ? 'selected' : ''}>
                                            <input
                                                type="radio"
                                                name="ac-audience"
                                                checked={audience === 'customer'}
                                                onChange={() => changeAudience('customer')}
                                            />
                                            <span>
                                                <strong>عميل محدد</strong>
                                                <small>اختر عميلًا واحدًا من قائمة العملاء</small>
                                            </span>
                                        </label>
                                    </div>

                                    {audience === 'customer' && (
                                        <div className="ao-form-group ac-customer-select">
                                            <label htmlFor="ac-customer-search">
                                                البحث عن العميل
                                            </label>

                                            <div className="ac-customer-search-wrap">
                                                <input
                                                    id="ac-customer-search"
                                                    type="search"
                                                    value={customerSearch}
                                                    onChange={(event) => {
                                                        setCustomerSearch(event.target.value)
                                                        setSelectedCustomerId('')
                                                        setCustomerDropdownOpen(true)
                                                    }}
                                                    onFocus={() => setCustomerDropdownOpen(true)}
                                                    placeholder="اكتب اسم العميل أو رقم جواله..."
                                                    autoComplete="off"
                                                />

                                                {customerDropdownOpen && (
                                                    <div className="ac-customer-results">
                                                        {filteredCustomers.length === 0 ? (
                                                            <div className="ac-customer-empty">
                                                                لا توجد نتائج مطابقة
                                                            </div>
                                                        ) : (
                                                            filteredCustomers.map((customer) => (
                                                                <button
                                                                    type="button"
                                                                    key={customer.uid}
                                                                    onClick={() => selectCustomer(customer)}
                                                                >
                                                                    <span className="ac-customer-avatar">
                                                                        {(customer.name || 'ع').charAt(0)}
                                                                    </span>

                                                                    <span>
                                                                        <strong>{customer.name || 'عميل'}</strong>
                                                                        <small>{customer.phone || 'لا يوجد رقم جوال'}</small>
                                                                    </span>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {selectedCustomer && (
                                                <div className="ac-selected-customer">
                                                    <span>✓</span>
                                                    <div>
                                                        <strong>{selectedCustomer.name}</strong>
                                                        <small>{selectedCustomer.phone}</small>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCustomerId('')
                                                            setCustomerSearch('')
                                                            setCustomerDropdownOpen(true)
                                                        }}
                                                    >
                                                        تغيير
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* حدود الاستخدام */}

                                <div className="ac-form-section">
                                    <h3>حدود الاستخدام</h3>

                                    <div className="ao-form-row">
                                        <div className="ao-form-group">
                                            <label htmlFor="ac-max-uses">
                                                إجمالي مرات الاستخدام
                                            </label>

                                            <input
                                                id="ac-max-uses"
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={maxUses}
                                                onChange={(event) => setMaxUses(event.target.value)}
                                                placeholder="غير محدود"
                                            />
                                            <small>اتركه فارغًا للسماح بالاستخدام غير المحدود</small>
                                        </div>

                                        <div className="ao-form-group">
                                            <label htmlFor="ac-max-per-customer">
                                                مرات الاستخدام لكل عميل
                                            </label>

                                            <input
                                                id="ac-max-per-customer"
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={maxUsesPerCustomer}
                                                onChange={(event) =>
                                                    setMaxUsesPerCustomer(event.target.value)
                                                }
                                                placeholder="1"
                                            />
                                            <small>مثال: 1 يعني مرة واحدة لكل عميل</small>
                                        </div>
                                    </div>
                                </div>

                                {/* الصلاحية */}

                                <div className="ac-form-section">
                                    <h3>فترة صلاحية الكوبون</h3>

                                    <div className="ao-form-row">
                                        <div className="ao-form-group">
                                            <label htmlFor="ac-start">تاريخ ووقت البداية</label>

                                            <input
                                                id="ac-start"
                                                type="datetime-local"
                                                value={couponStartsAt}
                                                onChange={(event) => setCouponStartsAt(event.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="ao-form-group">
                                            <label htmlFor="ac-end">تاريخ ووقت الانتهاء</label>

                                            <input
                                                id="ac-end"
                                                type="datetime-local"
                                                value={couponEndsAt}
                                                onChange={(event) => setCouponEndsAt(event.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* حالة الكوبون */}

                                <label className="ao-active-toggle">
                                    <input
                                        type="checkbox"
                                        checked={couponIsActive}
                                        onChange={(event) => setCouponIsActive(event.target.checked)}
                                    />

                                    <span>
                                        <strong>تفعيل الكوبون</strong>
                                        <small>لن يكون الكوبون متاحًا قبل موعد البداية أو بعد الانتهاء</small>
                                    </span>
                                </label>

                                {error && (
                                    <div className="ao-alert ao-alert-error">
                                        {error}
                                    </div>
                                )}

                            </div>

                            <div className="ao-modal-footer">
                                <button
                                    type="button"
                                    className="ao-cancel-button"
                                    onClick={closeCouponModal}
                                    disabled={saving}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="ao-primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? 'جاري الحفظ...'
                                        : editingCoupon
                                            ? 'حفظ التعديلات'
                                            : 'إنشاء الكوبون'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

        </div>
    )
}

export default AdminOffers
