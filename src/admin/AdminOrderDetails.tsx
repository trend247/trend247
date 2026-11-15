
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import {
    updateAdminOrderCustomer,
    updateAdminOrderContent,
} from './services/orderService'

import type {
    UserOrder,
    OrderCustomer,
    OrderItem,
    OrderStatus,
} from '../services/orderService'

type AdminOrderDetailsProps = {
    order: UserOrder
    onBack: () => void
    onSaved: (updatedOrder: UserOrder) => void
}

const orderStatuses: OrderStatus[] = [
    'قيد المراجعة',
    'قيد التجهيز',
    'تم الشحن',
    'مكتمل',
    'ملغي',
]

function formatPrice(price: number) {
    return `${Number(price || 0).toLocaleString('ar-SA')} ر.س`
}

function formatDate(date: UserOrder['createdAt']) {
    if (!date) return '—'

    return date.toDate().toLocaleString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
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

function AdminOrderDetails({
    order,
    onBack,
    onSaved,
}: AdminOrderDetailsProps) {
    // بيانات العميل
    const [customer, setCustomer] = useState<OrderCustomer>({
        name: order.customer?.name ?? '',
        phone: order.customer?.phone ?? '',
        city: order.customer?.city ?? '',
        address: order.customer?.address ?? '',
        notes: order.customer?.notes ?? '',
    })

    const [editingCustomer, setEditingCustomer] = useState(false)
    const [savingCustomer, setSavingCustomer] = useState(false)

    // بيانات الطلب
    const [items, setItems] = useState<OrderItem[]>(() =>
        order.items.map((item) => ({
            ...item,
            selectedColor: item.selectedColor
                ? { ...item.selectedColor }
                : null,
            selectedSize: item.selectedSize
                ? { ...item.selectedSize }
                : null,
        }))
    )

    const [shippingFee, setShippingFee] = useState(
        Number(order.shippingFee || 0)
    )

    const [paymentMethod, setPaymentMethod] = useState(
        order.paymentMethod || 'الدفع عند الاستلام'
    )

    const [status, setStatus] = useState<OrderStatus>(order.status)

    const [editingOrder, setEditingOrder] = useState(false)
    const [savingOrder, setSavingOrder] = useState(false)

    const subtotal = useMemo(
        () =>
            items.reduce(
                (sum, item) =>
                    sum +
                    Number(item.price || 0) *
                    Number(item.quantity || 0),
                0
            ),
        [items]
    )

    const total = subtotal + Number(shippingFee || 0)

    // =====================================
    // تعديل بيانات العميل
    // =====================================

    function changeCustomer(
        field: keyof OrderCustomer,
        value: string
    ) {
        setCustomer((current) => ({
            ...current,
            [field]: value,
        }))
    }

    function cancelCustomerEdit() {
        setCustomer({
            name: order.customer?.name ?? '',
            phone: order.customer?.phone ?? '',
            city: order.customer?.city ?? '',
            address: order.customer?.address ?? '',
            notes: order.customer?.notes ?? '',
        })

        setEditingCustomer(false)
    }

    async function saveCustomer(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (savingCustomer) return

        if (
            !customer.name.trim() ||
            !customer.phone.trim() ||
            !customer.city.trim() ||
            !customer.address.trim()
        ) {
            window.alert('يرجى إكمال بيانات العميل وعنوان التوصيل.')
            return
        }

        setSavingCustomer(true)

        try {
            await updateAdminOrderCustomer(
                order.userId,
                order.orderId,
                customer
            )

            onSaved({
                ...order,
                customer: { ...customer },
            })

            setEditingCustomer(false)
            window.alert('تم حفظ بيانات العميل بنجاح.')
        } catch (error) {
            console.error('Update customer error:', error)
            window.alert('تعذر حفظ بيانات العميل. حاول مرة أخرى.')
        } finally {
            setSavingCustomer(false)
        }
    }

    // =====================================
    // تعديل المنتجات
    // =====================================

    function changeItem(
        index: number,
        field: 'name' | 'image' | 'price' | 'quantity',
        value: string
    ) {
        setItems((current) =>
            current.map((item, itemIndex) => {
                if (itemIndex !== index) return item

                return {
                    ...item,
                    [field]:
                        field === 'price' || field === 'quantity'
                            ? Number(value)
                            : value,
                }
            })
        )
    }

    function changeVariant(
        index: number,
        type: 'selectedColor' | 'selectedSize',
        field: 'name' | 'value',
        value: string
    ) {
        setItems((current) =>
            current.map((item, itemIndex) => {
                if (itemIndex !== index) return item

                const previous = item[type]

                return {
                    ...item,
                    [type]: {
                        id: previous?.id ?? `custom-${type}`,
                        name: previous?.name ?? '',
                        value: previous?.value ?? '',
                        [field]: value,
                    },
                }
            })
        )
    }

    function addItem() {
        setItems((current) => [
            ...current,
            {
                id: Date.now(),
                name: '',
                image: '',
                price: 0,
                quantity: 1,
                subtotal: 0,
                selectedColor: null,
                selectedSize: null,
            },
        ])
    }

    function removeItem(index: number) {
        setItems((current) =>
            current.filter((_, itemIndex) => itemIndex !== index)
        )
    }

    function cancelOrderEdit() {
        setItems(
            order.items.map((item) => ({
                ...item,
                selectedColor: item.selectedColor
                    ? { ...item.selectedColor }
                    : null,
                selectedSize: item.selectedSize
                    ? { ...item.selectedSize }
                    : null,
            }))
        )

        setShippingFee(Number(order.shippingFee || 0))
        setPaymentMethod(order.paymentMethod || 'الدفع عند الاستلام')
        setStatus(order.status)
        setEditingOrder(false)
    }

    async function saveOrder(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (savingOrder) return

        if (items.length === 0) {
            window.alert('يجب أن يحتوي الطلب على منتج واحد على الأقل.')
            return
        }

        const invalidItem = items.some(
            (item) =>
                !item.name.trim() ||
                !Number.isFinite(Number(item.price)) ||
                Number(item.price) < 0 ||
                !Number.isInteger(Number(item.quantity)) ||
                Number(item.quantity) < 1
        )

        if (invalidItem) {
            window.alert('تحقق من أسماء المنتجات والأسعار والكميات.')
            return
        }

        if (
            !Number.isFinite(shippingFee) ||
            shippingFee < 0 ||
            !paymentMethod.trim()
        ) {
            window.alert('تحقق من رسوم الشحن وطريقة الدفع.')
            return
        }

        setSavingOrder(true)

        try {
            const updatedItems = items.map((item) => ({
                ...item,
                price: Number(item.price),
                quantity: Number(item.quantity),
                subtotal: Number(item.price) * Number(item.quantity),
            }))

            await updateAdminOrderContent(
                order.userId,
                order.orderId,
                {
                    items: updatedItems,
                    subtotal,
                    shippingFee,
                    total,
                    paymentMethod,
                    status,
                }
            )

            onSaved({
                ...order,
                items: updatedItems,
                subtotal,
                shippingFee,
                total,
                paymentMethod,
                status,
            })

            setEditingOrder(false)
            window.alert('تم حفظ تفاصيل الطلب بنجاح.')
        } catch (error) {
            console.error('Update order content error:', error)
            window.alert('تعذر حفظ تفاصيل الطلب. تحقق من الصلاحيات.')
        } finally {
            setSavingOrder(false)
        }
    }

    return (
        <div className="admin-order-details-page" dir="rtl">

            {/* رأس الصفحة */}

            <div className="admin-order-page-topbar">
                <button
                    type="button"
                    className="admin-order-back-button"
                    onClick={onBack}
                >
                    → العودة إلى الطلبات
                </button>

                <span className="admin-order-page-date">
                    تاريخ الطلب: {formatDate(order.createdAt)}
                </span>
            </div>

            <div className="admin-order-page-title">
                <div>
                    <span>تفاصيل الطلب</span>
                    <h2>{order.orderId}</h2>
                </div>

                <span
                    className={`admin-order-status-badge ${getStatusClass(status)}`}
                >
                    {status}
                </span>
            </div>

            {/* بيانات العميل */}

            <section className="admin-order-detail-card">

                <div className="admin-order-detail-card-header">
                    <div>
                        <h3>بيانات العميل</h3>
                        <p>معلومات العميل وعنوان توصيل الطلب</p>
                    </div>

                    {!editingCustomer && (
                        <button
                            type="button"
                            className="admin-order-edit-button"
                            onClick={() => setEditingCustomer(true)}
                        >
                            ✎ تعديل بيانات العميل
                        </button>
                    )}
                </div>

                {editingCustomer ? (
                    <form
                        className="admin-order-detail-form"
                        onSubmit={saveCustomer}
                    >
                        <div className="admin-order-detail-grid">

                            <label>
                                اسم العميل
                                <input
                                    value={customer.name}
                                    onChange={(e) =>
                                        changeCustomer('name', e.target.value)
                                    }
                                    required
                                />
                            </label>

                            <label>
                                رقم الهاتف
                                <input
                                    type="tel"
                                    dir="ltr"
                                    value={customer.phone}
                                    onChange={(e) =>
                                        changeCustomer('phone', e.target.value)
                                    }
                                    required
                                />
                            </label>

                            <label>
                                المدينة
                                <input
                                    value={customer.city}
                                    onChange={(e) =>
                                        changeCustomer('city', e.target.value)
                                    }
                                    required
                                />
                            </label>

                            <label>
                                العنوان
                                <input
                                    value={customer.address}
                                    onChange={(e) =>
                                        changeCustomer('address', e.target.value)
                                    }
                                    required
                                />
                            </label>

                            <label className="wide">
                                ملاحظات العميل
                                <textarea
                                    rows={3}
                                    value={customer.notes}
                                    onChange={(e) =>
                                        changeCustomer('notes', e.target.value)
                                    }
                                />
                            </label>

                        </div>

                        <div className="admin-order-edit-actions">
                            <button
                                type="button"
                                className="admin-order-cancel-edit"
                                onClick={cancelCustomerEdit}
                                disabled={savingCustomer}
                            >
                                إلغاء
                            </button>

                            <button
                                type="submit"
                                className="admin-order-save-edit"
                                disabled={savingCustomer}
                            >
                                {savingCustomer ? 'جارٍ الحفظ...' : 'حفظ بيانات العميل'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="admin-order-detail-grid">

                        <div className="admin-order-info-item">
                            <span>اسم العميل</span>
                            <strong>{customer.name || '—'}</strong>
                        </div>

                        <div className="admin-order-info-item">
                            <span>رقم الهاتف</span>
                            <strong dir="ltr">{customer.phone || '—'}</strong>
                        </div>

                        <div className="admin-order-info-item">
                            <span>المدينة</span>
                            <strong>{customer.city || '—'}</strong>
                        </div>

                        <div className="admin-order-info-item">
                            <span>عنوان التوصيل</span>
                            <strong>{customer.address || '—'}</strong>
                        </div>

                        <div className="admin-order-info-item wide">
                            <span>ملاحظات العميل</span>
                            <strong>{customer.notes || 'لا توجد ملاحظات'}</strong>
                        </div>

                    </div>
                )}
            </section>

            {/* المنتجات وتفاصيل الطلب */}

            <section className="admin-order-detail-card">

                <div className="admin-order-detail-card-header">
                    <div>
                        <h3>المنتجات المطلوبة</h3>
                        <p>
                            {items.length} منتج في هذا الطلب
                        </p>
                    </div>

                    {!editingOrder && (
                        <button
                            type="button"
                            className="admin-order-edit-button"
                            onClick={() => setEditingOrder(true)}
                        >
                            ✎ تعديل بيانات الطلب
                        </button>
                    )}
                </div>

                <form onSubmit={saveOrder}>

                    {items.length === 0 ? (
                        <div className="admin-order-no-products">
                            لا توجد منتجات في هذا الطلب.
                        </div>
                    ) : (
                        <div className="admin-order-products-list">

                            {items.map((item, index) => (
                                <div
                                    className="admin-order-detail-product"
                                    key={`${item.id}_${index}`}
                                >
                                    <div className="admin-order-product-image">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                            />
                                        ) : (
                                            <span>📦</span>
                                        )}
                                    </div>

                                    <div className="admin-order-product-information">

                                        {editingOrder ? (
                                            <>
                                                <label className="admin-order-product-field">
                                                    اسم المنتج
                                                    <input
                                                        value={item.name}
                                                        onChange={(e) =>
                                                            changeItem(
                                                                index,
                                                                'name',
                                                                e.target.value
                                                            )
                                                        }
                                                        required
                                                    />
                                                </label>

                                                <label className="admin-order-product-field">
                                                    رابط الصورة
                                                    <input
                                                        type="url"
                                                        dir="ltr"
                                                        value={item.image}
                                                        onChange={(e) =>
                                                            changeItem(
                                                                index,
                                                                'image',
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </label>

                                                <div className="admin-order-variant-fields">
                                                    <label>
                                                        اسم اللون
                                                        <input
                                                            value={item.selectedColor?.name ?? ''}
                                                            onChange={(e) =>
                                                                changeVariant(
                                                                    index,
                                                                    'selectedColor',
                                                                    'name',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <label>
                                                        قيمة اللون
                                                        <input
                                                            value={item.selectedColor?.value ?? ''}
                                                            onChange={(e) =>
                                                                changeVariant(
                                                                    index,
                                                                    'selectedColor',
                                                                    'value',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <label>
                                                        المقاس
                                                        <input
                                                            value={item.selectedSize?.name ?? ''}
                                                            onChange={(e) =>
                                                                changeVariant(
                                                                    index,
                                                                    'selectedSize',
                                                                    'name',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <label>
                                                        قيمة المقاس
                                                        <input
                                                            value={item.selectedSize?.value ?? ''}
                                                            onChange={(e) =>
                                                                changeVariant(
                                                                    index,
                                                                    'selectedSize',
                                                                    'value',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <h4>{item.name}</h4>

                                                <div className="admin-order-product-variants">
                                                    {item.selectedColor?.name && (
                                                        <span>
                                                            اللون: {item.selectedColor.name}
                                                        </span>
                                                    )}

                                                    {item.selectedSize?.name && (
                                                        <span>
                                                            المقاس: {item.selectedSize.name}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="admin-order-product-price">
                                                    سعر الوحدة: {formatPrice(item.price)}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="admin-order-product-quantity">

                                        {editingOrder ? (
                                            <>
                                                <label>
                                                    السعر
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.price}
                                                        onChange={(e) =>
                                                            changeItem(
                                                                index,
                                                                'price',
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </label>

                                                <label>
                                                    الكمية
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                            changeItem(
                                                                index,
                                                                'quantity',
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </label>
                                            </>
                                        ) : (
                                            <>
                                                <span>الكمية</span>
                                                <strong>{item.quantity}</strong>
                                                <b>
                                                    {formatPrice(
                                                        Number(item.price) *
                                                        Number(item.quantity)
                                                    )}
                                                </b>
                                            </>
                                        )}

                                    </div>

                                    {editingOrder && (
                                        <button
                                            type="button"
                                            className="admin-order-delete-product"
                                            onClick={() => removeItem(index)}
                                        >
                                            حذف
                                        </button>
                                    )}
                                </div>
                            ))}

                        </div>
                    )}

                    {editingOrder && (
                        <>
                            <button
                                type="button"
                                className="admin-order-add-product"
                                onClick={addItem}
                            >
                                + إضافة منتج
                            </button>

                            <div className="admin-order-edit-grid">

                                <label>
                                    رسوم الشحن (ر.س)
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={shippingFee}
                                        onChange={(e) =>
                                            setShippingFee(Number(e.target.value))
                                        }
                                    />
                                </label>

                                <label>
                                    طريقة الدفع
                                    <input
                                        value={paymentMethod}
                                        onChange={(e) =>
                                            setPaymentMethod(e.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    حالة الطلب
                                    <select
                                        value={status}
                                        onChange={(e) =>
                                            setStatus(e.target.value as OrderStatus)
                                        }
                                    >
                                        {orderStatuses.map((itemStatus) => (
                                            <option
                                                key={itemStatus}
                                                value={itemStatus}
                                            >
                                                {itemStatus}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                            </div>

                            <div className="admin-order-edit-actions">
                                <button
                                    type="button"
                                    className="admin-order-cancel-edit"
                                    onClick={cancelOrderEdit}
                                    disabled={savingOrder}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="admin-order-save-edit"
                                    disabled={savingOrder}
                                >
                                    {savingOrder ? 'جارٍ الحفظ...' : 'حفظ بيانات الطلب'}
                                </button>
                            </div>
                        </>
                    )}

                </form>
            </section>

            {/* ملخص المبالغ */}

            <section className="admin-order-detail-card admin-order-payment-card">
                <h3>ملخص المبالغ</h3>

                <div className="admin-order-money-row">
                    <span>مجموع المنتجات</span>
                    <strong>{formatPrice(subtotal)}</strong>
                </div>

                <div className="admin-order-money-row">
                    <span>رسوم الشحن</span>
                    <strong>{formatPrice(shippingFee)}</strong>
                </div>

                <div className="admin-order-money-total">
                    <span>الإجمالي النهائي</span>
                    <strong>{formatPrice(total)}</strong>
                </div>

                <div className="admin-order-payment-method">
                    <span>طريقة الدفع</span>
                    <strong>{paymentMethod || '—'}</strong>
                </div>
            </section>

        </div>
    )
}

export default AdminOrderDetails
