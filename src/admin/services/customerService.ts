
import {
    collection,
    getDocs,
    query,
    where,
} from 'firebase/firestore'

import { adminDb } from '../../firebase'

export type AdminCustomer = {
    uid: string
    name: string
    email: string
    phone: string
    phoneVerified: boolean
    emailVerified: boolean
}

function mapCustomer(
    id: string,
    data: Record<string, unknown>
): AdminCustomer {
    return {
        uid: id,
        name: typeof data.name === 'string' ? data.name : '',
        email: typeof data.email === 'string' ? data.email : '',
        phone: typeof data.phone === 'string' ? data.phone : '',
        phoneVerified: data.phoneVerified === true,
        emailVerified: data.emailVerified === true,
    }
}

// جلب جميع العملاء
export async function getAdminCustomers(): Promise<AdminCustomer[]> {
    const usersRef = collection(adminDb, 'users')
    const snapshot = await getDocs(usersRef)

    return snapshot.docs.map((item) =>
        mapCustomer(item.id, item.data())
    )
}

// البحث عن عميل بالبريد الإلكتروني أو رقم الهاتف
export async function searchAdminCustomers(
    searchValue: string
): Promise<AdminCustomer[]> {
    const value = searchValue.trim()

    if (value.length < 3) {
        return []
    }

    const usersRef = collection(adminDb, 'users')

    const [emailSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(
            query(
                usersRef,
                where('email', '==', value.toLowerCase())
            )
        ),
        getDocs(
            query(
                usersRef,
                where('phone', '==', value)
            )
        ),
    ])

    const customers = new Map<string, AdminCustomer>()

    emailSnapshot.docs.forEach((item) => {
        customers.set(
            item.id,
            mapCustomer(item.id, item.data())
        )
    })

    phoneSnapshot.docs.forEach((item) => {
        customers.set(
            item.id,
            mapCustomer(item.id, item.data())
        )
    })

    return Array.from(customers.values())
}
