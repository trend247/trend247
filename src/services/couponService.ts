
import {
    collection,
    getDocs,
    limit,
    query,
    where,
} from 'firebase/firestore'

import { db } from '../firebase'

// =====================================
// أنواع الكوبونات
// =====================================

export type CouponDiscountType = 'percentage' | 'fixed'

export type CouponAudience = 'all' | 'new' | 'customer'

export type PublicCoupon = {
    id: string
    code: string
    name: string

    discountType: CouponDiscountType
    discountValue: number

    minOrderAmount: number
    maxDiscountAmount: number | null

    audience: CouponAudience

    maxUses: number | null
    maxUsesPerCustomer: number | null

    usageCount: number

    startsAt: {
        toMillis: () => number
    }

    endsAt: {
        toMillis: () => number
    }

    isActive: boolean
}

export type AppliedCoupon = {
    couponId: string
    code: string
    name: string
    discountType: CouponDiscountType
    discountValue: number
    discountAmount: number
}

// =====================================
// تطبيع كود الكوبون
// =====================================

export function normalizeCouponCode(code: string): string {
    return code.trim().replace(/\s+/g, '').toUpperCase()
}

// =====================================
// التحقق من الكوبون وتحديد الخصم
// =====================================

export async function validateCoupon(
    code: string,
    userId: string,
    subtotal: number
): Promise<AppliedCoupon> {

    const normalizedCode = normalizeCouponCode(code)

    if (!normalizedCode) {
        throw new Error('يرجى إدخال كود الكوبون')
    }

    if (!userId) {
        throw new Error('يرجى تسجيل الدخول لاستخدام الكوبون')
    }

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
        throw new Error('السلة لا تحتوي على مبلغ صالح للخصم')
    }

    // البحث عن الكوبون النشط والمسموح للعملاء
    const couponQuery = query(
        collection(db, 'coupons'),

        where('code', '==', normalizedCode),
        where('isActive', '==', true),
        where('audience', 'in', ['all', 'new'])
    )

    const snapshot = await getDocs(couponQuery)

    if (snapshot.empty) {
        throw new Error(
            'الكوبون غير صحيح أو غير متاح للاستخدام'
        )
    }

    const couponDoc = snapshot.docs[0]

    const coupon = {
        id: couponDoc.id,
        ...couponDoc.data(),
    } as PublicCoupon

    // =====================================
    // التحقق من حالة الكوبون
    // =====================================

    if (!coupon.isActive) {
        throw new Error('هذا الكوبون غير مفعل')
    }

    // =====================================
    // التحقق من التواريخ
    // =====================================

    const now = Date.now()

    const startDate = coupon.startsAt.toMillis()
    const endDate = coupon.endsAt.toMillis()

    if (now < startDate) {
        throw new Error('لم يبدأ وقت استخدام هذا الكوبون بعد')
    }

    if (now > endDate) {
        throw new Error('انتهت صلاحية هذا الكوبون')
    }

    // =====================================
    // التحقق من الجمهور
    // =====================================

    if (
        coupon.audience !== 'all' &&
        coupon.audience !== 'new'
    ) {
        throw new Error('هذا الكوبون غير متاح لحسابك')
    }

    // =====================================
    // التحقق من العملاء الجدد
    // =====================================

    if (coupon.audience === 'new') {
        const ordersQuery = query(
            collection(db, 'users', userId, 'orders'),
            limit(1)
        )

        const ordersSnapshot = await getDocs(ordersQuery)

        if (!ordersSnapshot.empty) {
            throw new Error(
                'هذا الكوبون مخصص للعملاء الجدد فقط'
            )
        }
    }

    // =====================================
    // التحقق من الحد الأدنى للطلب
    // =====================================

    if (subtotal < coupon.minOrderAmount) {
        throw new Error(
            `الحد الأدنى لاستخدام الكوبون هو ${coupon.minOrderAmount.toFixed(2)} ر.س`
        )
    }

    // =====================================
    // التحقق من عدد الاستخدامات الإجمالي
    // =====================================

    if (
        coupon.maxUses !== null &&
        coupon.usageCount >= coupon.maxUses
    ) {
        throw new Error(
            'تم استنفاد عدد مرات استخدام هذا الكوبون'
        )
    }




    // =====================================
    // حساب الخصم
    // =====================================

    const calculatedDiscount =
        coupon.discountType === 'percentage'
            ? subtotal * (coupon.discountValue / 100)
            : coupon.discountValue

    // تطبيق الحد الأقصى للخصم
    const limitedDiscount =
        coupon.maxDiscountAmount !== null
            ? Math.min(
                calculatedDiscount,
                coupon.maxDiscountAmount
            )
            : calculatedDiscount

    // لا يمكن أن يتجاوز الخصم قيمة المنتجات
    const discountAmount = Math.round(
        Math.min(limitedDiscount, subtotal) * 100
    ) / 100

    if (discountAmount <= 0) {
        throw new Error('قيمة الخصم غير صالحة')
    }

    // =====================================
    // إرجاع بيانات الكوبون المطبق
    // =====================================

    return {
        couponId: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
    }
}
