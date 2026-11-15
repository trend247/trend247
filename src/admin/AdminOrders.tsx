
import { useEffect, useMemo, useState } from 'react'

import {
    getAdminOrders,
    updateOrderStatus,
} from './services/orderService'

import AdminOrderDetails from './AdminOrderDetails'
import AdminCreateOrder from './AdminCreateOrder'

import type {
    UserOrder,
    OrderStatus,
} from '../services/orderService'

const orderStatuses: OrderStatus[] = [
    'قيد المراجعة',
    'قيد التجهيز',
    'تم الشحن',
    'مكتمل',
    'ملغي',
]

type StatusFilter = 'الكل' | OrderStatus

function formatDate(date: UserOrder['createdAt']) {
    if (!date) return '—'

    return date.toDate().toLocaleString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatPrice(price: number) {
    return `${Number(price || 0).toLocaleString('ar-SA')} ر.س`
}

function getStatusClass(status: OrderStatus) {
    switch (status) {
        case 'قيد المراجعة':
            return 'status-review'
        case 'قيد التجهيز':
            return 'status-preparing'
        case 'تم الشحن':
            return 'status-shipped'
        case 'مكتمل':
            return 'status-completed'
        case 'ملغي':
            return 'status-cancelled'
        default:
            return ''
    }
}

function AdminOrders() {
    const [orders, setOrders] = useState<UserOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('الكل')
    const [processingIds, setProcessingIds] = useState<string[]>([])
    const [selectedOrder, setSelectedOrder] = useState<UserOrder | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    // =====================================
    // تحميل الطلبات
    // =====================================

    async function loadOrders(showLoading = true) {
        if (showLoading) {
            setLoading(true)
        }

        setError('')

        try {
            const result = await getAdminOrders()
            setOrders(result)
        } catch (err) {
            console.error('Load admin orders error:', err)
            setError('تعذر تحميل الطلبات. تحقق من اتصالك وصلاحيات المدير.')
        } finally {
            if (showLoading) {
                setLoading(false)
            }
        }
    }

    useEffect(() => {
        let active = true

        async function loadInitialOrders() {
            try {
                const result = await getAdminOrders()

                if (active) {
                    setOrders(result)
                }
            } catch (err) {
                console.error('Load admin orders error:', err)

                if (active) {
                    setError('تعذر تحميل الطلبات. تحقق من اتصالك وصلاحيات المدير.')
                }
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        void loadInitialOrders()

        return () => {
            active = false
        }
    }, [])

    // =====================================
    // البحث والتصفية
    // =====================================

    const filteredOrders = useMemo(() => {
        const value = search.trim().toLowerCase()

        return orders.filter((order) => {
            const matchesSearch =
                !value ||
                order.orderId.toLowerCase().includes(value) ||
                order.customer?.name?.toLowerCase().includes(value) ||
                order.customer?.phone?.toLowerCase().includes(value) ||
                order.customer?.city?.toLowerCase().includes(value)

            const matchesStatus =
                statusFilter === 'الكل' ||
                order.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [orders, search, statusFilter])

    // =====================================
    // تغيير حالة الطلب
    // =====================================

    async function handleStatusChange(
        order: UserOrder,
        status: OrderStatus
    ) {
        const processingId = `${order.userId}_${order.orderId}`

        if (processingIds.includes(processingId)) return
        if (order.status === status) return

        setProcessingIds((current) => [...current, processingId])

        try {
            await updateOrderStatus(
                order.userId,
                order.orderId,
                status
            )

            setOrders((current) =>
                current.map((item) =>
                    item.userId === order.userId &&
                        item.orderId === order.orderId
                        ? { ...item, status }
                        : item
                )
            )

            setSelectedOrder((current) =>
                current &&
                    current.userId === order.userId &&
                    current.orderId === order.orderId
                    ? { ...current, status }
                    : current
            )
        } catch (err) {
            console.error('Update order status error:', err)
            window.alert('تعذر تحديث حالة الطلب. حاول مرة أخرى.')
        } finally {
            setProcessingIds((current) =>
                current.filter((id) => id !== processingId)
            )
        }
    }

    // =====================================
    // استقبال الطلب بعد التعديل
    // =====================================

    function handleOrderSaved(updatedOrder: UserOrder) {
        setOrders((current) =>
            current.map((item) =>
                item.userId === updatedOrder.userId &&
                    item.orderId === updatedOrder.orderId
                    ? updatedOrder
                    : item
            )
        )

        setSelectedOrder(updatedOrder)
    }

    // =====================================
    // إنشاء طلب جديد
    // =====================================

    if (isCreating) {
        return (
            <AdminCreateOrder
                onBack={() => setIsCreating(false)}
                onCreated={async () => {
                    setIsCreating(false)
                    await loadOrders(false)
                }}
            />
        )
    }

    // =====================================
    // عرض صفحة تفاصيل الطلب
    // =====================================

    if (selectedOrder) {
        return (
            <AdminOrderDetails
                order={selectedOrder}
                onBack={() => setSelectedOrder(null)}
                onSaved={handleOrderSaved}
            />
        )
    }

    // =====================================
    // واجهة قائمة الطلبات
    // =====================================

    return (
        <div className="admin-orders-page" dir="rtl">

            <div className="admin-orders-page-heading">
                <div>
                    <h2>إدارة الطلبات</h2>
                    <p>
                        متابعة طلبات العملاء وإدارة تفاصيلها وحالاتها.
                    </p>
                </div>

                <div className="admin-orders-heading-actions">

                    <button
                        type="button"
                        className="admin-orders-create-button"
                        onClick={() => setIsCreating(true)}
                    >
                        + إنشاء طلب جديد
                    </button>

                    <button
                        type="button"
                        className="admin-orders-refresh"
                        onClick={() => void loadOrders()}
                        disabled={loading}
                    >
                        <span>↻</span>
                        {loading ? 'جارٍ التحديث...' : 'تحديث الطلبات'}
                    </button>

                </div>
            </div>

            {/* الإحصائيات */}

            <div className="admin-orders-summary">

                <div className="admin-orders-summary-card">
                    <span>إجمالي الطلبات</span>
                    <strong>{orders.length}</strong>
                    <small>جميع الطلبات</small>
                </div>

                <div className="admin-orders-summary-card review-card">
                    <span>قيد المراجعة</span>
                    <strong>
                        {orders.filter((order) => order.status === 'قيد المراجعة').length}
                    </strong>
                    <small>تحتاج إلى مراجعة</small>
                </div>

                <div className="admin-orders-summary-card preparing-card">
                    <span>قيد التجهيز</span>
                    <strong>
                        {orders.filter((order) => order.status === 'قيد التجهيز').length}
                    </strong>
                    <small>يتم تجهيزها</small>
                </div>

                <div className="admin-orders-summary-card completed-card">
                    <span>مكتملة</span>
                    <strong>
                        {orders.filter((order) => order.status === 'مكتمل').length}
                    </strong>
                    <small>تم إنجازها</small>
                </div>

            </div>

            {/* أدوات البحث والتصفية */}

            <div className="admin-orders-controls">

                <div className="admin-orders-search">
                    <span>⌕</span>

                    <input
                        type="search"
                        placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="admin-orders-filter">
                    <label htmlFor="orders-status-filter">
                        حالة الطلب:
                    </label>

                    <select
                        id="orders-status-filter"
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(e.target.value as StatusFilter)
                        }
                    >
                        <option value="الكل">جميع الحالات</option>

                        {orderStatuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>

            </div>

            {error && (
                <div className="admin-orders-error">
                    {error}
                </div>
            )}

            {/* محتوى الطلبات */}

            {loading ? (
                <div className="admin-orders-message">
                    جارٍ تحميل الطلبات...
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="admin-orders-empty">
                    <span>📦</span>

                    <h3>
                        {orders.length === 0
                            ? 'لا توجد طلبات حتى الآن'
                            : 'لم يتم العثور على طلبات'}
                    </h3>

                    <p>
                        {orders.length === 0
                            ? 'ستظهر طلبات العملاء هنا عند إتمام عمليات الشراء.'
                            : 'جرّب تغيير كلمات البحث أو حالة الطلب.'}
                    </p>
                </div>
            ) : (
                <div className="admin-orders-table-wrapper">

                    <table className="admin-orders-table">

                        <thead>
                            <tr>
                                <th>رقم الطلب</th>
                                <th>العميل</th>
                                <th>الهاتف</th>
                                <th>المدينة</th>
                                <th>المنتجات</th>
                                <th>الإجمالي</th>
                                <th>تاريخ الطلب</th>
                                <th>الحالة</th>
                                <th>التفاصيل</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredOrders.map((order) => {
                                const processingId =
                                    `${order.userId}_${order.orderId}`

                                const isProcessing =
                                    processingIds.includes(processingId)

                                const productsCount = order.items.reduce(
                                    (total, item) =>
                                        total + Number(item.quantity || 0),
                                    0
                                )

                                return (
                                    <tr
                                        key={processingId}
                                        onClick={() => setSelectedOrder(order)}
                                        className="admin-order-row"
                                    >
                                        <td className="admin-order-number">
                                            {order.orderId}
                                        </td>

                                        <td>
                                            <strong className="admin-order-customer-name">
                                                {order.customer?.name || '—'}
                                            </strong>
                                        </td>

                                        <td dir="ltr">
                                            {order.customer?.phone || '—'}
                                        </td>

                                        <td>
                                            {order.customer?.city || '—'}
                                        </td>

                                        <td>
                                            <span className="admin-order-products-count">
                                                {productsCount}
                                            </span>
                                        </td>

                                        <td className="admin-order-total">
                                            {formatPrice(order.total)}
                                        </td>

                                        <td>
                                            {formatDate(order.createdAt)}
                                        </td>

                                        <td onClick={(e) => e.stopPropagation()}>
                                            <select
                                                className={`admin-order-status ${getStatusClass(order.status)}`}
                                                value={order.status}
                                                disabled={isProcessing}
                                                onChange={(e) =>
                                                    void handleStatusChange(
                                                        order,
                                                        e.target.value as OrderStatus
                                                    )
                                                }
                                            >
                                                {orderStatuses.map((status) => (
                                                    <option
                                                        key={status}
                                                        value={status}
                                                    >
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>

                                            {isProcessing && (
                                                <small className="admin-order-saving">
                                                    جارٍ الحفظ...
                                                </small>
                                            )}
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="admin-order-view-button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedOrder(order)
                                                }}
                                            >
                                                عرض التفاصيل
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>

                    </table>

                    <div className="admin-orders-count">
                        عرض {filteredOrders.length} من أصل {orders.length} طلب
                    </div>

                </div>
            )}

        </div>
    )
}

export default AdminOrders
