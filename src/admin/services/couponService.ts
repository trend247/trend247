
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore'

import { adminDb } from '../../firebase'

// =====================================
// أنواع الكوبونات
// =====================================

export type CouponDiscountType = 'percentage' | 'fixed'

export type CouponAudience = 'all' | 'new' | 'customer'

export type Coupon = {
    id: string
    code: string
    name: string

    discountType: CouponDiscountType
    discountValue: number

    minOrderAmount: number
    maxDiscountAmount: number | null

    audience: CouponAudience

    customerId: string | null
    customerName: string | null
    customerPhone: string | null

    maxUses: number | null
    maxUsesPerCustomer: number | null

    usageCount: number

    startsAt: Timestamp
    endsAt: Timestamp

    isActive: boolean

    createdAt?: Timestamp
    updatedAt?: Timestamp
}

export type CouponInput = {
    code: string
    name: string

    discountType: CouponDiscountType
    discountValue: number

    minOrderAmount: number
    maxDiscountAmount: number | null

    audience: CouponAudience

    customerId: string | null
    customerName: string | null
    customerPhone: string | null

    maxUses: number | null
    maxUsesPerCustomer: number | null

    startsAt: Date
    endsAt: Date

    isActive: boolean
}

// =====================================
// مرجع مجموعة الكوبونات
// =====================================

const couponsCollection = collection(adminDb, 'coupons')

// =====================================
// تطبيع كود الكوبون
// =====================================

export function normalizeCouponCode(code: string): string {
    return code.trim().replace(/\s+/g, '').toUpperCase()
}

// =====================================
// التحقق من بيانات الكوبون
// =====================================

function validateCoupon(data: CouponInput) {
    const code = normalizeCouponCode(data.code)

    if (!code) {
        throw new Error('يرجى إدخال كود الكوبون')
    }

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
        throw new Error(
            'الكود يجب أن يتكون من 3 إلى 30 حرفًا أو رقمًا، ويسمح بالشرطة'
        )
    }

    if (!data.name.trim()) {
        throw new Error('يرجى إدخال اسم الكوبون')
    }

    if (!['percentage', 'fixed'].includes(data.discountType)) {
        throw new Error('نوع الخصم غير صحيح')
    }

    if (
        !Number.isFinite(data.discountValue) ||
        data.discountValue <= 0
    ) {
        throw new Error('قيمة الخصم يجب أن تكون أكبر من صفر')
    }

    if (
        data.discountType === 'percentage' &&
        data.discountValue > 100
    ) {
        throw new Error('نسبة الخصم لا يمكن أن تتجاوز 100%')
    }

    if (
        !Number.isFinite(data.minOrderAmount) ||
        data.minOrderAmount < 0
    ) {
        throw new Error('الحد الأدنى للطلب غير صحيح')
    }

    if (
        data.maxDiscountAmount !== null &&
        (
            !Number.isFinite(data.maxDiscountAmount) ||
            data.maxDiscountAmount <= 0
        )
    ) {
        throw new Error('الحد الأقصى للخصم غير صحيح')
    }

    if (
        data.maxUses !== null &&
        (
            !Number.isSafeInteger(data.maxUses) ||
            data.maxUses <= 0
        )
    ) {
        throw new Error('عدد مرات الاستخدام غير صحيح')
    }

    if (
        data.maxUsesPerCustomer !== null &&
        (
            !Number.isSafeInteger(data.maxUsesPerCustomer) ||
            data.maxUsesPerCustomer <= 0
        )
    ) {
        throw new Error('حد الاستخدام لكل عميل غير صحيح')
    }

    if (!['all', 'new', 'customer'].includes(data.audience)) {
        throw new Error('فئة المستفيدين غير صحيحة')
    }

    if (data.audience === 'customer' && !data.customerId?.trim()) {
        throw new Error('يرجى اختيار العميل المستفيد من الكوبون')
    }

    if (
        data.audience !== 'customer' &&
        (
            data.customerId !== null ||
            data.customerName !== null ||
            data.customerPhone !== null
        )
    ) {
        throw new Error('بيانات العميل المحدد غير متوافقة مع نوع الاستهداف')
    }

    if (
        !(data.startsAt instanceof Date) ||
        !(data.endsAt instanceof Date) ||
        Number.isNaN(data.startsAt.getTime()) ||
        Number.isNaN(data.endsAt.getTime())
    ) {
        throw new Error('تواريخ الكوبون غير صحيحة')
    }

    if (data.endsAt <= data.startsAt) {
        throw new Error('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية')
    }
}

// =====================================
// التأكد من عدم تكرار الكود
// =====================================

async function ensureUniqueCode(
    code: string,
    excludedCouponId?: string
) {
    const normalizedCode = normalizeCouponCode(code)

    const couponQuery = query(
        couponsCollection,
        where('code', '==', normalizedCode)
    )

    const snapshot = await getDocs(couponQuery)

    const duplicate = snapshot.docs.some(
        (item) => item.id !== excludedCouponId
    )

    if (duplicate) {
        throw new Error('هذا الكود مستخدم بالفعل، اختر كودًا آخر')
    }
}

// =====================================
// جلب جميع الكوبونات للمدير
// =====================================

export async function getAdminCoupons(): Promise<Coupon[]> {
    const snapshot = await getDocs(couponsCollection)

    const coupons = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
    })) as Coupon[]

    return coupons.sort((a, b) => {
        const dateA = a.createdAt?.toMillis() ?? 0
        const dateB = b.createdAt?.toMillis() ?? 0

        return dateB - dateA
    })
}

// =====================================
// إضافة كوبون جديد
// =====================================

export async function addCoupon(data: CouponInput): Promise<string> {
    validateCoupon(data)

    const code = normalizeCouponCode(data.code)

    await ensureUniqueCode(code)

    const docRef = await addDoc(couponsCollection, {
        code,
        name: data.name.trim(),

        discountType: data.discountType,
        discountValue: data.discountValue,

        minOrderAmount: data.minOrderAmount,
        maxDiscountAmount: data.maxDiscountAmount,

        audience: data.audience,

        customerId: data.customerId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,

        maxUses: data.maxUses,
        maxUsesPerCustomer: data.maxUsesPerCustomer,

        usageCount: 0,

        startsAt: Timestamp.fromDate(data.startsAt),
        endsAt: Timestamp.fromDate(data.endsAt),

        isActive: data.isActive,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return docRef.id
}

// =====================================
// تعديل كوبون
// =====================================

export async function updateCoupon(
    couponId: string,
    data: CouponInput
): Promise<void> {
    if (!couponId.trim()) {
        throw new Error('رقم الكوبون غير صحيح')
    }

    validateCoupon(data)

    const code = normalizeCouponCode(data.code)

    await ensureUniqueCode(code, couponId)

    const couponRef = doc(adminDb, 'coupons', couponId)

    await updateDoc(couponRef, {
        code,
        name: data.name.trim(),

        discountType: data.discountType,
        discountValue: data.discountValue,

        minOrderAmount: data.minOrderAmount,
        maxDiscountAmount: data.maxDiscountAmount,

        audience: data.audience,

        customerId: data.customerId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,

        maxUses: data.maxUses,
        maxUsesPerCustomer: data.maxUsesPerCustomer,

        startsAt: Timestamp.fromDate(data.startsAt),
        endsAt: Timestamp.fromDate(data.endsAt),

        isActive: data.isActive,

        updatedAt: serverTimestamp(),
    })
}

// =====================================
// تفعيل أو إيقاف كوبون
// =====================================

export async function toggleCouponStatus(
    couponId: string,
    isActive: boolean
): Promise<void> {
    if (!couponId.trim()) {
        throw new Error('رقم الكوبون غير صحيح')
    }

    const couponRef = doc(adminDb, 'coupons', couponId)

    await updateDoc(couponRef, {
        isActive,
        updatedAt: serverTimestamp(),
    })
}

// =====================================
// حذف كوبون
// =====================================

export async function deleteCoupon(
    couponId: string
): Promise<void> {
    if (!couponId.trim()) {
        throw new Error('رقم الكوبون غير صحيح')
    }

    const couponRef = doc(adminDb, 'coupons', couponId)

    await deleteDoc(couponRef)
}
