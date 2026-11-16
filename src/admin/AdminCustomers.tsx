import { useEffect, useMemo, useState } from 'react'

import {
    getAdminCustomers,
} from './services/customerService'

import {
    getAdminCustomerOrders,
} from './services/orderService'

import type {
    AdminCustomer,
} from './services/customerService'

import type {
    UserOrder,
} from '../services/orderService'

function formatOrderDate(createdAt: UserOrder['createdAt']): string {
    if (!createdAt) return 'التاريخ غير متوفر'

    const timestamp = createdAt as {
        toDate?: () => Date
    }

    const date = typeof timestamp.toDate === 'function'
        ? timestamp.toDate()
        : null

    if (!date || Number.isNaN(date.getTime())) {
        return 'التاريخ غير متوفر'
    }

    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

function formatPrice(price: number): string {
    return `${price.toLocaleString('ar-SA')} ر.س`
}

function getStatusClass(status: string): string {
    switch (status) {
        case 'مكتمل':
            return 'completed'

        case 'ملغي':
            return 'cancelled'

        case 'تم الشحن':
            return 'shipped'

        case 'قيد التجهيز':
            return 'processing'

        default:
            return 'pending'
    }
}

function AdminCustomers() {
    const [customers, setCustomers] = useState<AdminCustomer[]>([])
    const [searchValue, setSearchValue] = useState('')
    const [selectedCustomer, setSelectedCustomer] =
        useState<AdminCustomer | null>(null)

    const [orders, setOrders] = useState<UserOrder[]>([])
    const [openOrderId, setOpenOrderId] = useState<string | null>(null)

    const [loading, setLoading] = useState(true)
    const [ordersLoading, setOrdersLoading] = useState(false)
    const [error, setError] = useState('')
    const [ordersError, setOrdersError] = useState('')

    async function loadCustomers() {
        setLoading(true)
        setError('')

        try {
            const data = await getAdminCustomers()
            setCustomers(data)
        } catch (err) {
            console.error('Load customers error:', err)
            setError('تعذر تحميل قائمة العملاء. تحقق من صلاحيات Firestore.')
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        let cancelled = false

        async function fetchCustomers() {
            try {
                const data = await getAdminCustomers()

                if (!cancelled) {
                    setCustomers(data)
                    setError('')
                }
            } catch (err) {
                console.error('Load customers error:', err)

                if (!cancelled) {
                    setError(
                        'تعذر تحميل قائمة العملاء. تحقق من صلاحيات Firestore.'
                    )
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void fetchCustomers()

        return () => {
            cancelled = true
        }
    }, [])
    async function openCustomer(customer: AdminCustomer) {
        setSelectedCustomer(customer)
        setOrders([])
        setOpenOrderId(null)
        setOrdersError('')
        setOrdersLoading(true)

        try {
            const data = await getAdminCustomerOrders(customer.uid)
            setOrders(data)
        } catch (err) {
            console.error('Load customer orders error:', err)
            setOrdersError('تعذر تحميل طلبات هذا العميل.')
        } finally {
            setOrdersLoading(false)
        }
    }

    function closeCustomer() {
        setSelectedCustomer(null)
        setOrders([])
        setOpenOrderId(null)
        setOrdersError('')
    }

    function toggleOrder(orderId: string) {
        setOpenOrderId((current) =>
            current === orderId ? null : orderId
        )
    }

    const filteredCustomers = useMemo(() => {
        const value = searchValue.trim().toLowerCase()

        if (!value) return customers

        return customers.filter((customer) =>
            customer.name.toLowerCase().includes(value) ||
            customer.phone.toLowerCase().includes(value)
        )
    }, [customers, searchValue])

    const completedOrders = orders.filter(
        (order) => order.status === 'مكتمل'
    ).length

    const activeOrders = orders.filter(
        (order) =>
            order.status !== 'مكتمل' &&
            order.status !== 'ملغي'
    ).length

    if (selectedCustomer) {
        return (
            <div className="admin-customers-page" dir="rtl">

                {/* رأس تفاصيل العميل */}
                <div className="admin-customer-details-heading">
                    <div>
                        <h2>ملف العميل</h2>
                        <p>بيانات العميل وسجل طلباته في المتجر</p>
                    </div>

                    <button
                        type="button"
                        onClick={closeCustomer}
                    >
                        ← العودة إلى العملاء
                    </button>
                </div>

                {/* بيانات العميل */}
                <div className="admin-customer-profile">
                    <div className="admin-customer-avatar">
                        {selectedCustomer.name.charAt(0) || '؟'}
                    </div>

                    <div className="admin-customer-profile-info">
                        <h3>{selectedCustomer.name || 'بدون اسم'}</h3>
                        <span>
                            {selectedCustomer.phone || 'لا يوجد رقم هاتف'}
                        </span>
                    </div>
                </div>

                {/* معلومات العميل */}
                <div className="admin-customer-details-grid">

                    <div className="admin-customer-detail-card">
                        <span>الاسم</span>
                        <strong>{selectedCustomer.name || 'غير متوفر'}</strong>
                    </div>

                    <div className="admin-customer-detail-card">
                        <span>رقم الهاتف</span>
                        <strong>{selectedCustomer.phone || 'غير مسجل'}</strong>
                    </div>

                    <div className="admin-customer-detail-card">
                        <span>معرّف العميل</span>
                        <strong className="admin-customer-id">
                            {selectedCustomer.uid}
                        </strong>
                    </div>

                </div>

                {/* عنوان الطلبات */}
                <div className="admin-customer-orders-heading">
                    <div>
                        <h3>طلبات العميل</h3>
                        <p>اضغط على أي طلب لعرض تفاصيله</p>
                    </div>

                    <span className="admin-customer-orders-count">
                        {orders.length} طلب
                    </span>
                </div>

                {/* إحصائيات الطلبات */}
                <div className="admin-customer-orders-stats">

                    <div>
                        <span>إجمالي الطلبات</span>
                        <strong>{orders.length}</strong>
                    </div>

                    <div>
                        <span>طلبات مكتملة</span>
                        <strong>{completedOrders}</strong>
                    </div>

                    <div>
                        <span>طلبات قيد التنفيذ</span>
                        <strong>{activeOrders}</strong>
                    </div>

                </div>

                {/* تحميل الطلبات */}
                {ordersLoading ? (
                    <div className="admin-customers-message">
                        جارٍ تحميل طلبات العميل...
                    </div>
                ) : ordersError ? (
                    <div className="admin-customers-error">
                        <p>{ordersError}</p>

                        <button
                            type="button"
                            onClick={() => void openCustomer(selectedCustomer)}
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="admin-customers-empty">
                        <span>📦</span>
                        <h3>لا توجد طلبات لهذا العميل</h3>
                        <p>ستظهر طلباته هنا عند إتمام أول عملية شراء.</p>
                    </div>
                ) : (
                    <div className="admin-customer-orders-list">

                        {orders.map((order) => {
                            const isOpen = openOrderId === order.id

                            return (
                                <div
                                    className={`admin-customer-order-card ${isOpen ? 'open' : ''}`}
                                    key={order.id}
                                >

                                    {/* رأس الطلب القابل للضغط */}
                                    <button
                                        type="button"
                                        className="admin-customer-order-toggle"
                                        onClick={() => toggleOrder(order.id)}
                                        aria-expanded={isOpen}
                                    >
                                        <div className="admin-customer-order-main">
                                            <div className="admin-customer-order-icon">
                                                <span>📦</span>
                                            </div>

                                            <div className="admin-customer-order-info">
                                                <strong>
                                                    طلب #{order.orderId || order.id}
                                                </strong>

                                                <small>
                                                    {formatOrderDate(order.createdAt)}
                                                </small>
                                            </div>
                                        </div>

                                        <div className="admin-customer-order-summary">
                                            <strong className="admin-customer-order-total">
                                                {formatPrice(order.total)}
                                            </strong>

                                            <span
                                                className={`admin-customer-order-status ${getStatusClass(order.status)}`}
                                            >
                                                {order.status || 'غير محدد'}
                                            </span>
                                        </div>

                                        <span className={`admin-customer-order-chevron ${isOpen ? 'rotated' : ''}`}>
                                            ⌄
                                        </span>
                                    </button>

                                    {/* تفاصيل الطلب المنسدلة */}
                                    <div
                                        className={`admin-customer-order-collapse ${isOpen ? 'expanded' : ''}`}
                                    >
                                        <div className="admin-customer-order-details">

                                            <div className="admin-customer-order-details-title">
                                                <strong>المنتجات</strong>
                                                <span>
                                                    {order.items.length} منتج
                                                </span>
                                            </div>

                                            {order.items.map((item, index) => (
                                                <div
                                                    className="admin-customer-order-item"
                                                    key={`${item.id}-${item.variantKey ?? ''}-${index}`}
                                                >
                                                    <div className="admin-customer-order-item-image">
                                                        {item.image ? (
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                            />
                                                        ) : (
                                                            <span>📦</span>
                                                        )}
                                                    </div>

                                                    <div className="admin-customer-order-item-info">
                                                        <strong>{item.name}</strong>

                                                        <small>
                                                            الكمية: {item.quantity}
                                                            {item.selectedColor
                                                                ? ` · اللون: ${item.selectedColor}`
                                                                : ''}
                                                            {item.selectedSize
                                                                ? ` · المقاس: ${item.selectedSize}`
                                                                : ''}
                                                        </small>
                                                    </div>

                                                    <strong className="admin-customer-order-item-price">
                                                        {formatPrice(
                                                            item.price * item.quantity
                                                        )}
                                                    </strong>
                                                </div>
                                            ))}

                                            {/* ملخص المبلغ */}
                                            <div className="admin-customer-order-payment">

                                                <div>
                                                    <span>مجموع المنتجات</span>
                                                    <strong>
                                                        {formatPrice(order.subtotal)}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>رسوم الشحن</span>
                                                    <strong>
                                                        {formatPrice(order.shippingFee)}
                                                    </strong>
                                                </div>

                                                <div className="admin-customer-order-grand-total">
                                                    <span>الإجمالي النهائي</span>
                                                    <strong>
                                                        {formatPrice(order.total)}
                                                    </strong>
                                                </div>

                                            </div>

                                            {/* بيانات التوصيل والدفع */}
                                            <div className="admin-customer-order-extra">

                                                <div>
                                                    <span>طريقة الدفع</span>
                                                    <strong>
                                                        {order.paymentMethod || 'غير محددة'}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>مدينة التوصيل</span>
                                                    <strong>
                                                        {order.customer?.city || 'غير محددة'}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>عنوان التوصيل</span>
                                                    <strong>
                                                        {order.customer?.address || 'غير محدد'}
                                                    </strong>
                                                </div>

                                                {order.customer?.notes && (
                                                    <div>
                                                        <span>ملاحظات الطلب</span>
                                                        <strong>
                                                            {order.customer.notes}
                                                        </strong>
                                                    </div>
                                                )}

                                            </div>

                                        </div>
                                    </div>

                                </div>
                            )
                        })}

                    </div>
                )}

            </div>
        )
    }

    return (
        <div className="admin-customers-page" dir="rtl">

            <div className="admin-customers-heading">
                <div>
                    <h2>إدارة العملاء</h2>
                    <p>عرض جميع حسابات عملاء TREND247 وإدارة بياناتهم</p>
                </div>

                <button
                    type="button"
                    className="admin-customers-refresh"
                    onClick={() => void loadCustomers()}
                    disabled={loading}
                >
                    ↻ تحديث القائمة
                </button>
            </div>

            {/* الإحصائيات */}
            <div className="admin-customers-stats">

                <div className="admin-customer-stat">
                    <span>إجمالي العملاء</span>
                    <strong>{customers.length}</strong>
                    <small>عدد الحسابات المسجلة</small>
                </div>

            </div>

            {/* البحث */}
            <div className="admin-customers-toolbar">
                <input
                    type="search"
                    placeholder="ابحث باسم العميل أو رقم الهاتف..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                />

                <span>
                    {filteredCustomers.length} من {customers.length} عميل
                </span>
            </div>

            {/* قائمة العملاء */}
            {loading ? (
                <div className="admin-customers-message">
                    جارٍ تحميل قائمة العملاء...
                </div>
            ) : error ? (
                <div className="admin-customers-error">
                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={() => void loadCustomers()}
                    >
                        إعادة المحاولة
                    </button>
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="admin-customers-empty">
                    <span>👥</span>

                    <h3>
                        {searchValue
                            ? 'لا توجد نتائج مطابقة'
                            : 'لا يوجد عملاء حتى الآن'}
                    </h3>

                    <p>
                        {searchValue
                            ? 'جرّب البحث باستخدام بيانات مختلفة.'
                            : 'ستظهر هنا حسابات العملاء المسجلة في المتجر.'}
                    </p>
                </div>
            ) : (
                <div className="admin-customers-table-wrapper">

                    <table className="admin-customers-table">

                        <thead>
                            <tr>
                                <th>العميل</th>
                                <th>رقم الهاتف</th>
                                <th>التفاصيل</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.uid}>

                                    <td>
                                        <div className="admin-customer-table-name">
                                            <span className="admin-customer-table-avatar">
                                                {customer.name.charAt(0) || '؟'}
                                            </span>

                                            <strong>
                                                {customer.name || 'بدون اسم'}
                                            </strong>
                                        </div>
                                    </td>

                                    <td>{customer.phone || '—'}</td>



                                    <td>
                                        <button
                                            type="button"
                                            className="admin-customer-view-button"
                                            onClick={() => void openCustomer(customer)}
                                        >
                                            عرض التفاصيل
                                        </button>
                                    </td>

                                </tr>
                            ))}
                        </tbody>

                    </table>

                </div>
            )}

        </div>
    )
}

export default AdminCustomers
