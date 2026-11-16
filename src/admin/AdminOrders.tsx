
import { useEffect, useMemo, useState } from 'react'

import {
    getAdminOrders,
    updateOrderStatus,
    deleteAdminOrders,
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

type AdminModal = {
    type: 'confirm' | 'success' | 'error'
    title: string
    message: string
    confirmText?: string
    onConfirm?: () => void | Promise<void>
}

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

function getOrderKey(order: UserOrder) {
    return JSON.stringify([order.userId, order.orderId])
}

function AdminOrders() {
    const [orders, setOrders] = useState<UserOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('الكل')

    const [processingIds, setProcessingIds] = useState<string[]>([])
    const [selectedOrderKeys, setSelectedOrderKeys] = useState<string[]>([])

    const [bulkStatus, setBulkStatus] = useState<OrderStatus>('قيد التجهيز')
    const [bulkProcessing, setBulkProcessing] = useState(false)

    const [selectedOrder, setSelectedOrder] = useState<UserOrder | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    const [adminModal, setAdminModal] = useState<AdminModal | null>(null)

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
            setSelectedOrderKeys([])
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
    // تحديد الطلبات
    // =====================================

    const selectedOrders = useMemo(
        () =>
            orders.filter((order) =>
                selectedOrderKeys.includes(getOrderKey(order))
            ),
        [orders, selectedOrderKeys]
    )

    const allVisibleSelected =
        filteredOrders.length > 0 &&
        filteredOrders.every((order) =>
            selectedOrderKeys.includes(getOrderKey(order))
        )

    function toggleOrderSelection(order: UserOrder) {
        const key = getOrderKey(order)

        setSelectedOrderKeys((current) =>
            current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key]
        )
    }

    function toggleSelectAll() {
        if (allVisibleSelected) {
            const visibleKeys = filteredOrders.map(getOrderKey)

            setSelectedOrderKeys((current) =>
                current.filter((key) => !visibleKeys.includes(key))
            )
        } else {
            setSelectedOrderKeys((current) => {
                const keys = new Set(current)

                filteredOrders.forEach((order) => {
                    keys.add(getOrderKey(order))
                })

                return Array.from(keys)
            })
        }
    }

    function clearSelection() {
        setSelectedOrderKeys([])
    }

    // =====================================
    // تغيير حالة طلب واحد
    // =====================================

    async function handleStatusChange(
        order: UserOrder,
        status: OrderStatus
    ) {
        const processingId = getOrderKey(order)

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
                    getOrderKey(item) === processingId
                        ? { ...item, status }
                        : item
                )
            )

            setSelectedOrder((current) =>
                current && getOrderKey(current) === processingId
                    ? { ...current, status }
                    : current
            )
        } catch (err) {
            console.error('Update order status error:', err)

            setAdminModal({
                type: 'error',
                title: 'تعذر تحديث الطلب',
                message: 'حدث خطأ أثناء تحديث حالة الطلب. يرجى المحاولة مرة أخرى.',
            })
        } finally {
            setProcessingIds((current) =>
                current.filter((id) => id !== processingId)
            )
        }
    }

    // =====================================
    // تغيير حالة الطلبات المحددة
    // =====================================

    async function handleBulkStatusChange() {
        if (selectedOrders.length === 0 || bulkProcessing) return

        const ordersToUpdate = selectedOrders.filter(
            (order) => order.status !== bulkStatus
        )

        if (ordersToUpdate.length === 0) {
            setAdminModal({
                type: 'error',
                title: 'لا يوجد تغيير',
                message: 'الطلبات المحددة تحمل هذه الحالة بالفعل.',
            })
            return
        }

        setAdminModal({
            type: 'confirm',
            title: 'تأكيد تغيير حالة الطلبات',
            message: `هل تريد تغيير حالة ${ordersToUpdate.length} طلب إلى "${bulkStatus}"؟`,
            confirmText: 'تأكيد التغيير',

            onConfirm: async () => {
                setAdminModal(null)
                setBulkProcessing(true)

                try {
                    await Promise.all(
                        ordersToUpdate.map((order) =>
                            updateOrderStatus(
                                order.userId,
                                order.orderId,
                                bulkStatus
                            )
                        )
                    )

                    const updatedKeys = new Set(
                        ordersToUpdate.map(getOrderKey)
                    )

                    setOrders((current) =>
                        current.map((order) =>
                            updatedKeys.has(getOrderKey(order))
                                ? { ...order, status: bulkStatus }
                                : order
                        )
                    )

                    setSelectedOrder((current) =>
                        current && updatedKeys.has(getOrderKey(current))
                            ? { ...current, status: bulkStatus }
                            : current
                    )

                    setSelectedOrderKeys([])

                    setAdminModal({
                        type: 'success',
                        title: 'تم تحديث الطلبات',
                        message: `تم تغيير حالة ${ordersToUpdate.length} طلب بنجاح.`,
                    })
                } catch (err) {
                    console.error('Bulk status update error:', err)

                    await loadOrders(false)

                    setAdminModal({
                        type: 'error',
                        title: 'تعذر تحديث بعض الطلبات',
                        message: 'حدث خطأ أثناء تحديث الطلبات. تمت إعادة تحميل القائمة من قاعدة البيانات.',
                    })
                } finally {
                    setBulkProcessing(false)
                }
            },
        })
    }

    // =====================================
    // حذف الطلبات المحددة
    // =====================================

    async function handleBulkDelete() {
        if (selectedOrders.length === 0 || bulkProcessing) return

        const ordersToDelete = [...selectedOrders]

        setAdminModal({
            type: 'confirm',
            title: 'حذف الطلبات المحددة',
            message: `أنت على وشك حذف ${ordersToDelete.length} طلب نهائيًا. لا يمكن التراجع عن هذه العملية.`,
            confirmText: 'نعم، احذف الطلبات',

            onConfirm: async () => {
                setAdminModal(null)
                setBulkProcessing(true)

                try {
                    await deleteAdminOrders(ordersToDelete)

                    const deletedKeys = new Set(
                        ordersToDelete.map(getOrderKey)
                    )

                    setOrders((current) =>
                        current.filter(
                            (order) => !deletedKeys.has(getOrderKey(order))
                        )
                    )

                    setSelectedOrderKeys([])

                    setAdminModal({
                        type: 'success',
                        title: 'تم حذف الطلبات',
                        message: `تم حذف ${ordersToDelete.length} طلب بنجاح.`,
                    })
                } catch (err) {
                    console.error('Bulk delete orders error:', err)

                    await loadOrders(false)

                    setAdminModal({
                        type: 'error',
                        title: 'تعذر حذف الطلبات',
                        message: 'لم نتمكن من حذف بعض الطلبات. تمت إعادة تحميل القائمة من قاعدة البيانات.',
                    })
                } finally {
                    setBulkProcessing(false)
                }
            },
        })
    }

    // =====================================
    // استقبال الطلب بعد التعديل
    // =====================================

    function handleOrderSaved(updatedOrder: UserOrder) {
        setOrders((current) =>
            current.map((item) =>
                getOrderKey(item) === getOrderKey(updatedOrder)
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
                        disabled={loading || bulkProcessing}
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
                        onChange={(e) => {
                            setSearch(e.target.value)
                            clearSelection()
                        }}
                    />
                </div>

                <div className="admin-orders-filter">
                    <label htmlFor="orders-status-filter">
                        حالة الطلب:
                    </label>

                    <select
                        id="orders-status-filter"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value as StatusFilter)
                            clearSelection()
                        }}
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

            {/* شريط الإجراءات الجماعية */}

            {selectedOrders.length > 0 && (
                <div className="admin-orders-bulk-actions">

                    <div className="admin-orders-bulk-info">
                        <strong>
                            تم تحديد {selectedOrders.length} طلب
                        </strong>

                        <button
                            type="button"
                            onClick={clearSelection}
                            disabled={bulkProcessing}
                        >
                            إلغاء التحديد
                        </button>
                    </div>

                    <div className="admin-orders-bulk-controls">

                        <select
                            value={bulkStatus}
                            onChange={(e) =>
                                setBulkStatus(e.target.value as OrderStatus)
                            }
                            disabled={bulkProcessing}
                            aria-label="الحالة الجديدة للطلبات"
                        >
                            {orderStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className="admin-orders-bulk-status-button"
                            onClick={() => void handleBulkStatusChange()}
                            disabled={bulkProcessing}
                        >
                            تغيير حالة المحدد
                        </button>

                        <button
                            type="button"
                            className="admin-orders-bulk-delete-button"
                            onClick={() => void handleBulkDelete()}
                            disabled={bulkProcessing}
                        >
                            حذف المحدد
                        </button>

                    </div>

                    {bulkProcessing && (
                        <span className="admin-orders-bulk-loading">
                            جارٍ تنفيذ العملية...
                        </span>
                    )}

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
                                <th className="admin-order-select-cell">
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAll}
                                        aria-label="تحديد جميع الطلبات الظاهرة"
                                        disabled={bulkProcessing}
                                    />
                                </th>
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
                                const processingId = getOrderKey(order)
                                const isProcessing = processingIds.includes(processingId)
                                const isSelected = selectedOrderKeys.includes(processingId)

                                const productsCount = order.items.reduce(
                                    (total, item) =>
                                        total + Number(item.quantity || 0),
                                    0
                                )

                                return (
                                    <tr
                                        key={processingId}
                                        onClick={() => setSelectedOrder(order)}
                                        className={`admin-order-row ${isSelected ? 'admin-order-row-selected' : ''}`}
                                    >
                                        <td
                                            className="admin-order-select-cell"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleOrderSelection(order)}
                                                aria-label={`تحديد الطلب ${order.orderId}`}
                                                disabled={bulkProcessing}
                                            />
                                        </td>

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
                                                disabled={isProcessing || bulkProcessing}
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

            {/* =====================================
                النافذة المنبثقة
            ===================================== */}

            {adminModal && (
                <div
                    className="admin-modal-overlay"
                    onClick={() => {
                        if (!bulkProcessing) {
                            setAdminModal(null)
                        }
                    }}
                >
                    <div
                        className={`admin-modal admin-modal-${adminModal.type}`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-modal-title"
                    >
                        <div className="admin-modal-icon">
                            {adminModal.type === 'confirm' && (
                                <span>!</span>
                            )}

                            {adminModal.type === 'success' && (
                                <span>✓</span>
                            )}

                            {adminModal.type === 'error' && (
                                <span>×</span>
                            )}
                        </div>

                        <h3 id="admin-modal-title">
                            {adminModal.title}
                        </h3>

                        <p>{adminModal.message}</p>

                        <div className="admin-modal-actions">

                            {adminModal.type === 'confirm' ? (
                                <>
                                    <button
                                        type="button"
                                        className="admin-modal-cancel"
                                        onClick={() => setAdminModal(null)}
                                        disabled={bulkProcessing}
                                    >
                                        إلغاء
                                    </button>

                                    <button
                                        type="button"
                                        className="admin-modal-confirm"
                                        onClick={() => void adminModal.onConfirm?.()}
                                        disabled={bulkProcessing}
                                    >
                                        {adminModal.confirmText || 'تأكيد'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className="admin-modal-close"
                                    onClick={() => setAdminModal(null)}
                                >
                                    حسنًا
                                </button>
                            )}

                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default AdminOrders
