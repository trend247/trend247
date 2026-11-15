
import {
    collection,
    getDocs,
    query,
    where,
} from 'firebase/firestore'

import { db } from '../firebase'

export type StoreCategory = {
    id: string
    name: string
    icon: string
    image: string
    description: string
    isActive: boolean
    sortOrder: number
}

// تحويل مستند Firestore إلى تصنيف
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
        isActive: data.isActive === true,
        sortOrder:
            typeof data.sortOrder === 'number'
                ? data.sortOrder
                : 0,
    }
}

// جلب التصنيفات النشطة فقط للمتجر
export async function getActiveCategories(): Promise<StoreCategory[]> {
    const activeQuery = query(
        collection(db, 'categories'),
        where('isActive', '==', true)
    )

    const snapshot = await getDocs(activeQuery)

    return snapshot.docs
        .map(item => mapCategory(item.id, item.data()))
        .filter(category => category.name.trim() !== '')
        .sort((a, b) => a.sortOrder - b.sortOrder)
}
