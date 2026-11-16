
import {
    collection,
    getDocs,
    query,
    where,
} from 'firebase/firestore'

import { db } from '../firebase'

export type StoreOffer = {
    id: string
    name: string
    type: 'product'
    discountType: 'percentage' | 'fixed'
    discountValue: number
    productIds: number[]
    startsAt: import('firebase/firestore').Timestamp
    endsAt: import('firebase/firestore').Timestamp
    isActive: boolean
}

export async function getActiveOffers(): Promise<StoreOffer[]> {
    const offersRef = collection(db, 'offers')

    const offersQuery = query(
        offersRef,
        where('isActive', '==', true)
    )

    const snapshot = await getDocs(offersQuery)

    const now = Date.now()

    return snapshot.docs
        .map((item) => ({
            id: item.id,
            ...item.data(),
        }) as StoreOffer)
        .filter((offer) => {
            const startsAt = offer.startsAt.toMillis()
            const endsAt = offer.endsAt.toMillis()

            return startsAt <= now && endsAt > now
        })
}
