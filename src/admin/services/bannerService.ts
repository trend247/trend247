
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore'

import { adminDb } from '../../firebase'

import type {
    BannerInput,
    StoreBanner,
} from '../types/banner'

const BANNERS_COLLECTION = 'banners'

// =====================================
// جلب جميع البنرات
// =====================================

export async function getBanners(): Promise<StoreBanner[]> {
    const bannersQuery = query(
        collection(adminDb, BANNERS_COLLECTION),
        orderBy('sortOrder', 'asc')
    )

    const snapshot = await getDocs(bannersQuery)

    return snapshot.docs.map((bannerDoc) => ({
        id: bannerDoc.id,
        ...bannerDoc.data(),
    })) as StoreBanner[]
}

// =====================================
// إضافة بنر
// =====================================

export async function addBanner(
    data: BannerInput
): Promise<string> {
    const docRef = await addDoc(
        collection(adminDb, BANNERS_COLLECTION),
        {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }
    )

    return docRef.id
}

// =====================================
// تعديل بنر
// =====================================

export async function updateBanner(
    id: string,
    data: Partial<BannerInput>
): Promise<void> {
    await updateDoc(
        doc(adminDb, BANNERS_COLLECTION, id),
        {
            ...data,
            updatedAt: serverTimestamp(),
        }
    )
}

// =====================================
// تفعيل / إيقاف بنر
// =====================================

export async function toggleBannerStatus(
    id: string,
    active: boolean
): Promise<void> {
    await updateDoc(
        doc(adminDb, BANNERS_COLLECTION, id),
        {
            active,
            updatedAt: serverTimestamp(),
        }
    )
}

// =====================================
// حذف بنر
// =====================================

export async function deleteBanner(
    id: string
): Promise<void> {
    await deleteDoc(
        doc(adminDb, BANNERS_COLLECTION, id)
    )
}
