
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    writeBatch,
    setDoc,
} from 'firebase/firestore'

import { adminDb } from '../../firebase'
import { categories as defaultCategories } from '../../data/categories'

export type StoreCategory = {
    id: string
    name: string
    icon: string
    image: string
    description: string
    isActive: boolean
    sortOrder: number
    createdAt: string
    updatedAt: string
}

const CATEGORIES_COLLECTION = 'categories'
const PRODUCTS_COLLECTION = 'products'

const defaultIcons = ['🎧', '👕', '🍳', '🧴', '🧸', '🏋️', '🚘', '🧳']

// تحويل بيانات Firestore إلى تصنيف
function mapCategory(
    id: string,
    data: Record<string, unknown>
): StoreCategory {
    return {
        id,
        name: typeof data.name === 'string' ? data.name : '',
        icon: typeof data.icon === 'string' ? data.icon : '📦',
        image: typeof data.image === 'string' ? data.image : '',
        description:
            typeof data.description === 'string'
                ? data.description
                : '',
        isActive: data.isActive !== false,
        sortOrder:
            typeof data.sortOrder === 'number'
                ? data.sortOrder
                : 0,
        createdAt:
            typeof data.createdAt === 'string'
                ? data.createdAt
                : '',
        updatedAt:
            typeof data.updatedAt === 'string'
                ? data.updatedAt
                : '',
    }
}

// إضافة التصنيفات الافتراضية عند أول تشغيل فقط
export async function initializeCategories() {
    const now = new Date().toISOString()

    for (let index = 0; index < defaultCategories.length; index++) {
        const category = defaultCategories[index]
        const id = `category-${index + 1}`

        const categoryRef = doc(
            adminDb,
            CATEGORIES_COLLECTION,
            id
        )

        const snapshot = await getDoc(categoryRef)

        if (!snapshot.exists()) {
            await setDoc(categoryRef, {
                name: category.name,
                icon: category.icon || defaultIcons[index] || '📦',
                image: category.image,
                description: '',
                isActive: true,
                sortOrder: index + 1,
                createdAt: now,
                updatedAt: now,
            })
        }
    }
}

// جلب جميع التصنيفات في لوحة التحكم
export async function getAdminCategories(): Promise<StoreCategory[]> {
    await initializeCategories()

    const snapshot = await getDocs(
        collection(adminDb, CATEGORIES_COLLECTION)
    )

    return snapshot.docs
        .map((item) => mapCategory(item.id, item.data()))
        .sort((a, b) => a.sortOrder - b.sortOrder)
}

// جلب التصنيفات النشطة فقط للمتجر
export async function getActiveCategories(): Promise<StoreCategory[]> {
    const activeQuery = query(
        collection(adminDb, CATEGORIES_COLLECTION),
        where('isActive', '==', true)
    )

    const snapshot = await getDocs(activeQuery)

    return snapshot.docs
        .map((item) => mapCategory(item.id, item.data()))
        .sort((a, b) => a.sortOrder - b.sortOrder)
}

// إضافة تصنيف جديد

export async function addCategory(
    data: Omit<StoreCategory, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = new Date().toISOString()

    const result = await addDoc(
        collection(adminDb, CATEGORIES_COLLECTION),
        {
            ...data,
            createdAt: now,
            updatedAt: now,
        }
    )

    return result.id
}


// تعديل تصنيف
export async function updateCategory(
    id: string,
    data: Partial<Omit<StoreCategory, 'id' | 'createdAt'>>
) {
    const categoryRef = doc(
        adminDb,
        CATEGORIES_COLLECTION,
        id
    )

    const snapshot = await getDoc(categoryRef)

    if (!snapshot.exists()) {
        throw new Error('التصنيف غير موجود')
    }

    const oldName = snapshot.data().name
    const newName = data.name?.trim()

    // عند تغيير اسم التصنيف، نحدّث المنتجات المرتبطة به
    if (
        typeof oldName === 'string' &&
        newName &&
        oldName !== newName
    ) {
        const productsQuery = query(
            collection(adminDb, PRODUCTS_COLLECTION),
            where('category', '==', oldName)
        )

        const productsSnapshot = await getDocs(productsQuery)
        const products = productsSnapshot.docs

        // تقسيم التحديثات إلى مجموعات لتجنب تجاوز حد Firestore
        for (
            let index = 0;
            index < products.length;
            index += 450
        ) {
            const batch = writeBatch(adminDb)
            const group = products.slice(index, index + 450)

            group.forEach((product) => {
                batch.update(product.ref, {
                    category: newName,
                })
            })

            await batch.commit()
        }
    }

    // حذف القيم undefined قبل الحفظ
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(
            ([, value]) => value !== undefined
        )
    )

    await updateDoc(categoryRef, {
        ...cleanData,
        updatedAt: new Date().toISOString(),
    })
}

// إظهار أو إخفاء تصنيف
export async function toggleCategoryStatus(
    id: string,
    isActive: boolean
) {
    await updateDoc(
        doc(adminDb, CATEGORIES_COLLECTION, id),
        {
            isActive,
            updatedAt: new Date().toISOString(),
        }
    )
}

// حذف تصنيف بشرط ألا يكون مرتبطًا بمنتجات
export async function deleteCategory(id: string) {
    const categoryRef = doc(
        adminDb,
        CATEGORIES_COLLECTION,
        id
    )

    const snapshot = await getDoc(categoryRef)

    if (!snapshot.exists()) {
        throw new Error('التصنيف غير موجود')
    }

    const categoryName = snapshot.data().name

    const productsQuery = query(
        collection(adminDb, PRODUCTS_COLLECTION),
        where('category', '==', categoryName)
    )

    const productsSnapshot = await getDocs(productsQuery)

    if (!productsSnapshot.empty) {
        throw new Error(
            `لا يمكن حذف التصنيف لأنه مرتبط بـ ${productsSnapshot.size} منتج. يمكنك إخفاؤه بدلًا من حذفه.`
        )
    }

    await deleteDoc(categoryRef)
}
