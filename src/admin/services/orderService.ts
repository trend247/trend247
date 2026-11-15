
import {
    collection,
    collectionGroup,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore'

import { adminDb } from '../../firebase'

import type {
    UserOrder,
    OrderStatus,
    OrderCustomer,
    OrderItem,
} from '../../services/orderService'

// =====================================
// تحديد مكان الطلب
// =====================================

function getAdminOrderRef(
    userId: string,
    orderId: string
) {
    if (userId) {
        return doc(
            adminDb,
            'users',
            userId,
            'orders',
            orderId
        )
    }

    return doc(adminDb, 'orders', orderId)
}

// =====================================
// تجهيز المنتجات للحفظ
// =====================================

function prepareOrderItems(items: OrderItem[]) {
    return items.map((item) => ({
        id: item.id,
        variantKey: item.variantKey ?? '',
        name: item.name.trim(),
        image: item.image ?? '',
        price: Number(item.price),
        quantity: Number(item.quantity),
        subtotal: Number(item.price) * Number(item.quantity),
        selectedColor: item.selectedColor ?? null,
        selectedSize: item.selectedSize ?? null,
    }))
}

// =====================================
// تحويل بيانات الطلب
// =====================================

function mapAdminOrder(
    orderId: string,
    data: Record<string, unknown>
): UserOrder {
    return {
        id: orderId,
        orderId:
            typeof data.orderId === 'string'
                ? data.orderId
                : orderId,
        userId:
            typeof data.userId === 'string'
                ? data.userId
                : '',
        customer: data.customer as OrderCustomer,
        items: Array.isArray(data.items)
            ? data.items as OrderItem[]
            : [],
        subtotal:
            typeof data.subtotal === 'number'
                ? data.subtotal
                : 0,
        shippingFee:
            typeof data.shippingFee === 'number'
                ? data.shippingFee
                : 0,
        total:
            typeof data.total === 'number'
                ? data.total
                : 0,
        paymentMethod:
            typeof data.paymentMethod === 'string'
                ? data.paymentMethod
                : '',
        status: data.status as OrderStatus,
        createdAt: (data.createdAt ?? null) as UserOrder['createdAt'],
    }
}

// =====================================
// جلب جميع الطلبات
// =====================================

export async function getAdminOrders(): Promise<UserOrder[]> {
    
    const ordersQuery = query(
        collectionGroup(adminDb, 'orders'),
        orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(ordersQuery)

    return snapshot.docs.map((orderDoc) => {
        return mapAdminOrder(
            orderDoc.id,
            orderDoc.data()
        )
    })
}

// =====================================
// جلب طلبات عميل محدد
// =====================================

export async function getAdminCustomerOrders(
    userId: string
): Promise<UserOrder[]> {
    const customerOrdersRef = collection(
        adminDb,
        'users',
        userId,
        'orders'
    )

    const ordersQuery = query(
        customerOrdersRef,
        orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(ordersQuery)

    return snapshot.docs.map((orderDoc) =>
        mapAdminOrder(
            orderDoc.id,
            orderDoc.data()
        )
    )
}

// =====================================
// جلب طلب واحد
// =====================================

export async function getAdminOrder(
    userId: string,
    orderId: string
): Promise<UserOrder | null> {
    const orderRef = getAdminOrderRef(userId, orderId)

    const snapshot = await getDoc(orderRef)

    if (!snapshot.exists()) return null

    return mapAdminOrder(
        snapshot.id,
        snapshot.data()
    )
}

// =====================================
// تغيير حالة الطلب فقط
// =====================================

export async function updateOrderStatus(
    userId: string,
    orderId: string,
    status: OrderStatus
): Promise<void> {
    const orderRef = getAdminOrderRef(userId, orderId)

    await updateDoc(orderRef, {
        status,
        updatedAt: serverTimestamp(),
    })
}

// =====================================
// أنواع تعديل الطلب
// =====================================

export type AdminOrderUpdate = {
    customer: OrderCustomer
    items: OrderItem[]
    subtotal: number
    shippingFee: number
    total: number
    paymentMethod: string
    status: OrderStatus
}

export type AdminOrderContentUpdate = {
    items: OrderItem[]
    subtotal: number
    shippingFee: number
    total: number
    paymentMethod: string
    status: OrderStatus
}

// =====================================
// تعديل بيانات الطلب بالكامل
// =====================================

export async function updateAdminOrder(
    userId: string,
    orderId: string,
    order: AdminOrderUpdate
): Promise<void> {
    const orderRef = getAdminOrderRef(userId, orderId)

    const safeItems = prepareOrderItems(order.items)

    await updateDoc(orderRef, {
        customer: {
            name: order.customer.name.trim(),
            phone: order.customer.phone.trim(),
            city: order.customer.city.trim(),
            address: order.customer.address.trim(),
            notes: order.customer.notes.trim(),
        },
        items: safeItems,
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        total: Number(order.total),
        paymentMethod: order.paymentMethod.trim(),
        status: order.status,
        updatedAt: serverTimestamp(),
    })
}

// =====================================
// تعديل بيانات العميل
// =====================================

export async function updateAdminOrderCustomer(
    userId: string,
    orderId: string,
    customer: OrderCustomer
): Promise<void> {
    const orderRef = getAdminOrderRef(userId, orderId)

    await updateDoc(orderRef, {
        customer: {
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            city: customer.city.trim(),
            address: customer.address.trim(),
            notes: customer.notes.trim(),
        },
        updatedAt: serverTimestamp(),
    })
}

// =====================================
// تعديل محتوى الطلب
// =====================================

export async function updateAdminOrderContent(
    userId: string,
    orderId: string,
    order: AdminOrderContentUpdate
): Promise<void> {
    const orderRef = getAdminOrderRef(userId, orderId)

    const safeItems = prepareOrderItems(order.items)

    await updateDoc(orderRef, {
        items: safeItems,
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        total: Number(order.total),
        paymentMethod: order.paymentMethod.trim(),
        status: order.status,
        updatedAt: serverTimestamp(),
    })
}

// =====================================
// إنشاء طلب جديد من لوحة التحكم
// =====================================

export type CreateAdminOrderInput = {
    userId?: string
    customer: OrderCustomer
    items: OrderItem[]
    subtotal: number
    shippingFee: number
    total: number
    paymentMethod: string
    status: OrderStatus
}

export async function createAdminOrder(
    order: CreateAdminOrderInput
): Promise<string> {
    const userId = order.userId?.trim() ?? ''

    // تحديد مجموعة الطلبات بحسب نوع العميل
    const ordersCollection = userId
        ? collection(adminDb, 'users', userId, 'orders')
        : collection(adminDb, 'orders')

    // إنشاء معرّف فريد من Firestore
    const orderRef = doc(ordersCollection)

    const orderId = orderRef.id

    const safeItems = prepareOrderItems(order.items)

    await setDoc(orderRef, {
        orderId,
        userId,

        customerType: userId
            ? 'registered'
            : 'guest',

        createdByAdmin: true,

        customer: {
            name: order.customer.name.trim(),
            phone: order.customer.phone.trim(),
            city: order.customer.city.trim(),
            address: order.customer.address.trim(),
            notes: order.customer.notes.trim(),
        },

        items: safeItems,

        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        total: Number(order.total),

        paymentMethod: order.paymentMethod.trim(),
        status: order.status,

        createdAt: serverTimestamp(),
    })

    return orderId
}
