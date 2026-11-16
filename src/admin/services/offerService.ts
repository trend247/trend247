
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
// أنواع البيانات
// =====================================

export type OfferDiscountType = 'percentage' | 'fixed'

export type Offer = {
    id: string
    name: string
    type: 'product'
    discountType: OfferDiscountType
    discountValue: number
    productIds: number[]
    startsAt: Timestamp
    endsAt: Timestamp
    isActive: boolean
    createdAt?: Timestamp
    updatedAt?: Timestamp
}

export type OfferInput = {
    name: string
    type: 'product'
    discountType: OfferDiscountType
    discountValue: number
    productIds: number[]
    startsAt: Date
    endsAt: Date
    isActive: boolean
}

// =====================================
// التحقق من بيانات العرض
// =====================================

function validateOffer(data: OfferInput) {
    if (!data.name.trim()) {
        throw new Error('يرجى إدخال اسم العرض')
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

    if (!Array.isArray(data.productIds) || data.productIds.length === 0) {
        throw new Error('يرجى اختيار منتج واحد على الأقل')
    }

    if (data.productIds.some(
        (id) => !Number.isSafeInteger(id) || id <= 0
    )) {
        throw new Error('يوجد رقم منتج غير صحيح')
    }

    if (
        !(data.startsAt instanceof Date) ||
        !(data.endsAt instanceof Date) ||
        Number.isNaN(data.startsAt.getTime()) ||
        Number.isNaN(data.endsAt.getTime())
    ) {
        throw new Error('تاريخ العرض غير صحيح')
    }

    if (data.endsAt <= data.startsAt) {
        throw new Error('تاريخ انتهاء العرض يجب أن يكون بعد تاريخ بدايته')
    }
}

// =====================================
// جلب جميع العروض للمدير
// =====================================

export async function getAdminOffers(): Promise<Offer[]> {
    const offersRef = collection(adminDb, 'offers')

    const snapshot = await getDocs(offersRef)

    const offers = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
    })) as Offer[]

    return offers.sort((a, b) => {
        const dateA = a.createdAt?.toMillis() ?? 0
        const dateB = b.createdAt?.toMillis() ?? 0

        return dateB - dateA
    })
}

// =====================================
// جلب العروض الصالحة للمتجر
// =====================================

export async function getActiveOffers(): Promise<Offer[]> {
    const now = Timestamp.now()

    const offersRef = collection(adminDb, 'offers')

    const offersQuery = query(
        offersRef,
        where('isActive', '==', true),
        where('startsAt', '<=', now),
        where('endsAt', '>', now)
    )

    const snapshot = await getDocs(offersQuery)

    return snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
    })) as Offer[]
}

// =====================================
// إضافة عرض جديد
// =====================================

export async function addOffer(data: OfferInput): Promise<string> {
    validateOffer(data)

    const offersRef = collection(adminDb, 'offers')

    const docRef = await addDoc(offersRef, {
        name: data.name.trim(),
        type: data.type,
        discountType: data.discountType,
        discountValue: data.discountValue,
        productIds: [...new Set(data.productIds)],
        startsAt: Timestamp.fromDate(data.startsAt),
        endsAt: Timestamp.fromDate(data.endsAt),
        isActive: data.isActive,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return docRef.id
}

// =====================================
// تعديل عرض
// =====================================

export async function updateOffer(
    offerId: string,
    data: OfferInput
): Promise<void> {
    validateOffer(data)

    if (!offerId.trim()) {
        throw new Error('رقم العرض غير صحيح')
    }

    const offerRef = doc(adminDb, 'offers', offerId)

    await updateDoc(offerRef, {
        name: data.name.trim(),
        type: data.type,
        discountType: data.discountType,
        discountValue: data.discountValue,
        productIds: [...new Set(data.productIds)],
        startsAt: Timestamp.fromDate(data.startsAt),
        endsAt: Timestamp.fromDate(data.endsAt),
        isActive: data.isActive,
        updatedAt: serverTimestamp(),
    })
}

// =====================================
// تفعيل أو إيقاف عرض
// =====================================

export async function toggleOfferStatus(
    offerId: string,
    isActive: boolean
): Promise<void> {
    if (!offerId.trim()) {
        throw new Error('رقم العرض غير صحيح')
    }

    const offerRef = doc(adminDb, 'offers', offerId)

    await updateDoc(offerRef, {
        isActive,
        updatedAt: serverTimestamp(),
    })
}

// =====================================
// حذف عرض
// =====================================

export async function deleteOffer(
    offerId: string
): Promise<void> {
    if (!offerId.trim()) {
        throw new Error('رقم العرض غير صحيح')
    }

    const offerRef = doc(adminDb, 'offers', offerId)

    await deleteDoc(offerRef)
}
