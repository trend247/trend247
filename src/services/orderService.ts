
import {
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
} from 'firebase/firestore'

import { db } from '../firebase'

// =====================================
// أنواع بيانات الطلب
// =====================================

export type OrderCustomer = {
    name: string
    phone: string
    city: string
    address: string
    notes: string
}

export type OrderVariant = {
    id: string
    name: string
    value: string
}

export type OrderItem = {
    id: number
    variantKey?: string
    name: string
    image: string
    price: number
    quantity: number
    subtotal?: number
    selectedColor?: OrderVariant | null
    selectedSize?: OrderVariant | null
}

export type OrderStatus =
    | 'قيد المراجعة'
    | 'قيد التجهيز'
    | 'تم الشحن'
    | 'مكتمل'
    | 'ملغي'

export type UserOrder = {
    id: string
    orderId: string
    userId: string
    customer: OrderCustomer
    items: OrderItem[]
    subtotal: number
    shippingFee: number
    total: number
    paymentMethod: string
    status: OrderStatus
    createdAt: Timestamp | null
}

export type NewOrder = Omit<UserOrder, 'id' | 'createdAt'>

// =====================================
// حفظ طلب العميل
// =====================================

export async function saveUserOrder(order: NewOrder): Promise<string> {
    const orderRef = doc(
        db,
        'users',
        order.userId,
        'orders',
        order.orderId
    )

    await setDoc(orderRef, {
        ...order,
        createdAt: serverTimestamp(),
    })

    return order.orderId
}

// =====================================
// جلب طلبات عميل معين
// =====================================

export async function getUserOrders(
    userId: string
): Promise<UserOrder[]> {
    const ordersRef = collection(
        db,
        'users',
        userId,
        'orders'
    )

    const ordersQuery = query(
        ordersRef,
        orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(ordersQuery)

    return snapshot.docs.map((orderDoc) => {
        const data = orderDoc.data()

        return {
            id: orderDoc.id,
            orderId: data.orderId,
            userId: data.userId,
            customer: data.customer,
            items: data.items,
            subtotal: data.subtotal,
            shippingFee: data.shippingFee,
            total: data.total,
            paymentMethod: data.paymentMethod,
            status: data.status,
            createdAt: data.createdAt ?? null,
        } as UserOrder
    })
}
