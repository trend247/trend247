
import { useEffect, useMemo, useState } from 'react'

import type { FormEvent } from 'react'

import type {
    Product,
    ProductVariant,
} from '../context/store-context'

import type {
    OrderCustomer,
    OrderItem,
    OrderStatus,
} from '../services/orderService'

import {
    createAdminOrder,
} from './services/orderService'

import {
    getPublishedProducts,
} from './services/productService'

import {
    searchAdminCustomers,
} from './services/customerService'

import type {
    AdminCustomer,
} from './services/customerService'

type AdminCreateOrderProps = {
    onBack: () => void
    onCreated: () => void
}

type CustomerType = 'registered' | 'guest'

type DraftItem = OrderItem & {
    selectedColor: OrderItem['selectedColor']
    selectedSize: OrderItem['selectedSize']
}

const initialCustomer: OrderCustomer = {
    name: '',
    phone: '',
    city: '',
    address: '',
    notes: '',
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

function toOrderVariant(
    variant: ProductVariant
) {
    return {
        id: variant.id,
        name: variant.name,
        value: variant.value,
    }
}

function AdminCreateOrder({
    onBack,
    onCreated,
}: AdminCreateOrderProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [productsLoading, setProductsLoading] = useState(true)
    const [productsError, setProductsError] = useState('')

    const [customerType, setCustomerType] =
        useState<CustomerType>('guest')

    const [customer, setCustomer] =
        useState<OrderCustomer>({ ...initialCustomer })

    const [customerSearch, setCustomerSearch] = useState('')
    const [customerResults, setCustomerResults] =
        useState<AdminCustomer[]>([])

    const [customerSearching, setCustomerSearching] = useState(false)
    const [selectedCustomerId, setSelectedCustomerId] = useState('')

    const [productSearch, setProductSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('الكل')

    const [selectedProduct, setSelectedProduct] =
        useState<Product | null>(null)

    const [selectedColorId, setSelectedColorId] = useState('')
    const [selectedSizeId, setSelectedSizeId] = useState('')
    const [selectedQuantity, setSelectedQuantity] = useState(1)
    const [selectedPrice, setSelectedPrice] = useState('')

    const [items, setItems] = useState<DraftItem[]>([])

    const [shippingFee, setShippingFee] = useState('0')
    const [paymentMethod, setPaymentMethod] =
        useState('الدفع عند الاستلام')

    const [status, setStatus] =
        useState<OrderStatus>('قيد المراجعة')

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // =====================================
    // تحميل المنتجات المنشورة
    // =====================================

    useEffect(() => {
        let active = true

        async function loadProducts() {
            setProductsLoading(true)
            setProductsError('')

            try {
                const result = await getPublishedProducts()

                if (active) {
                    setProducts(result)
                }
            } catch (err) {
                console.error('Load order products error:', err)

                if (active) {
                    setProductsError(
                        'تعذر تحميل المنتجات. تحقق من اتصالك وصلاحيات الإدارة.'
                    )
                }
            } finally {
                if (active) {
                    setProductsLoading(false)
                }
            }
        }

        void loadProducts()

        return () => {
            active = false
        }
    }, [])

    // =====================================
    // التصنيفات المتاحة
    // =====================================

    const categories = useMemo(() => {
        return [
            'الكل',
            ...Array.from(
                new Set(
                    products
                        .map((product) => product.category)
                        .filter(Boolean)
                )
            ),
        ]
    }, [products])

    // =====================================
    // البحث والتصفية عن المنتجات
    // =====================================

    const filteredProducts = useMemo(() => {
        const value = productSearch.trim().toLowerCase()

        return products.filter((product) => {
            const matchesSearch =
                !value ||
                product.name.toLowerCase().includes(value) ||
                product.category.toLowerCase().includes(value) ||
                (product.sku ?? '').toLowerCase().includes(value) ||
                (product.brand ?? '').toLowerCase().includes(value)

            const matchesCategory =
                categoryFilter === 'الكل' ||
                product.category === categoryFilter

            return matchesSearch && matchesCategory
        })
    }, [products, productSearch, categoryFilter])

    // =====================================
    // البحث عن عميل مسجل
    // =====================================

    async function handleCustomerSearch() {
        const value = customerSearch.trim()

        if (value.length < 3) {
            setError('أدخل بريدًا إلكترونيًا أو رقم هاتف صحيحًا للبحث.')
            return
        }

        setCustomerSearching(true)
        setError('')
        setCustomerResults([])

        try {
            const result = await searchAdminCustomers(value)
            setCustomerResults(result)

            if (result.length === 0) {
                setError('لم يتم العثور على عميل بهذه البيانات.')
            }
        } catch (err) {
            console.error('Search customer error:', err)
            setError('تعذر البحث عن العميل. تحقق من صلاحيات Firestore.')
        } finally {
            setCustomerSearching(false)
        }
    }

    function selectCustomer(found: AdminCustomer) {
        setSelectedCustomerId(found.uid)

        setCustomer({
            ...initialCustomer,
            name: found.name,
            phone: found.phone,
        })

        setCustomerResults([])
        setCustomerSearch('')
        setError('')
    }

    function changeCustomerType(type: CustomerType) {
        setCustomerType(type)
        setCustomer({ ...initialCustomer })
        setSelectedCustomerId('')
        setCustomerSearch('')
        setCustomerResults([])
        setError('')
    }

    // =====================================
    // اختيار منتج من الكتالوج
    // =====================================

    function openProduct(product: Product) {
        setSelectedProduct(product)
        setSelectedColorId('')
        setSelectedSizeId('')
        setSelectedQuantity(1)
        setSelectedPrice(String(product.price))
        setError('')
    }

    function closeProduct() {
        setSelectedProduct(null)
    }

    function addSelectedProduct() {
        if (!selectedProduct) return

        const price = Number(selectedPrice)
        const quantity = Number(selectedQuantity)

        if (!Number.isFinite(price) || price < 0) {
            setError('أدخل سعرًا صحيحًا للمنتج.')
            return
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            setError('أدخل كمية صحيحة لا تقل عن واحد.')
            return
        }

        const color = selectedProduct.colors?.find(
            (variant) => variant.id === selectedColorId
        )

        const size = selectedProduct.sizes?.find(
            (variant) => variant.id === selectedSizeId
        )

        const variantKey = [
            selectedProduct.id,
            color?.id ?? '',
            size?.id ?? '',
        ].join('_')

        const newItem: DraftItem = {
            id: selectedProduct.id,
            variantKey,
            name: selectedProduct.name,
            image: selectedProduct.image,
            price,
            quantity,
            subtotal: price * quantity,
            selectedColor: color ? toOrderVariant(color) : null,
            selectedSize: size ? toOrderVariant(size) : null,
        }

        setItems((current) => {
            const existingIndex = current.findIndex(
                (item) => item.variantKey === variantKey
            )

            if (existingIndex === -1) {
                return [...current, newItem]
            }

            return current.map((item, index) =>
                index === existingIndex
                    ? {
                        ...item,
                        quantity: item.quantity + quantity,
                        subtotal:
                            price * (item.quantity + quantity),
                    }
                    : item
            )
        })

        setSelectedProduct(null)
        setError('')
    }

    // =====================================
    // تعديل عناصر الطلب
    // =====================================

    function updateItemQuantity(
        index: number,
        quantity: number
    ) {
        if (!Number.isInteger(quantity) || quantity < 1) return

        setItems((current) =>
            current.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        quantity,
                        subtotal: item.price * quantity,
                    }
                    : item
            )
        )
    }

    function updateItemPrice(
        index: number,
        price: number
    ) {
        if (!Number.isFinite(price) || price < 0) return

        setItems((current) =>
            current.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        price,
                        subtotal: price * item.quantity,
                    }
                    : item
            )
        )
    }

    function removeItem(index: number) {
        setItems((current) =>
            current.filter((_, itemIndex) => itemIndex !== index)
        )
    }

    // =====================================
    // حساب الإجماليات
    // =====================================

    const subtotal = useMemo(() => {
        return items.reduce(
            (total, item) =>
                total + item.price * item.quantity,
            0
        )
    }, [items])

    const shipping = Math.max(0, Number(shippingFee) || 0)
    const total = subtotal + shipping

    // =====================================
    // حفظ الطلب
    // =====================================

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()
        setError('')

        if (customerType === 'registered' && !selectedCustomerId) {
            setError('ابحث عن عميل مسجل واختره أولًا.')
            return
        }

        if (
            !customer.name.trim() ||
            !customer.phone.trim() ||
            !customer.city.trim() ||
            !customer.address.trim()
        ) {
            setError('أكمل اسم العميل ورقم الهاتف والمدينة والعنوان.')
            return
        }

        if (items.length === 0) {
            setError('أضف منتجًا واحدًا على الأقل إلى الطلب.')
            return
        }

        if (!Number.isFinite(shipping) || shipping < 0) {
            setError('أدخل رسوم شحن صحيحة.')
            return
        }

        setSaving(true)

        try {
            await createAdminOrder({
                userId:
                    customerType === 'registered'
                        ? selectedCustomerId
                        : '',
                customer,
                items,
                subtotal,
                shippingFee: shipping,
                total,
                paymentMethod,
                status,
            })

            window.alert('تم إنشاء الطلب بنجاح.')
            onCreated()
        } catch (err) {
            console.error('Create admin order error:', err)
            setError(
                'تعذر إنشاء الطلب. تحقق من قواعد Firestore وحاول مرة أخرى.'
            )
        } finally {
            setSaving(false)
        }
    }

    // =====================================
    // الواجهة
    // =====================================

    return (
        <div className="admin-create-order" dir="rtl">

            <div className="admin-create-order-heading">
                <div>
                    <h2>إنشاء طلب جديد</h2>
                    <p>اختر العميل والمنتجات ثم أكمل بيانات الطلب.</p>
                </div>

                <button
                    type="button"
                    className="admin-create-back"
                    onClick={onBack}
                >
                    العودة إلى الطلبات
                </button>
            </div>

            {error && (
                <div className="admin-create-error">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>

                {/* العميل */}

                <section className="admin-create-section">
                    <div className="admin-create-section-heading">
                        <h3>1. بيانات العميل</h3>
                        <p>حدد نوع العميل الذي تريد إنشاء الطلب له.</p>
                    </div>

                    <div className="admin-create-customer-types">
                        <button
                            type="button"
                            className={
                                customerType === 'registered'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() => changeCustomerType('registered')}
                        >
                            عميل مسجل
                        </button>

                        <button
                            type="button"
                            className={
                                customerType === 'guest'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() => changeCustomerType('guest')}
                        >
                            عميل غير مسجل
                        </button>
                    </div>

                    {customerType === 'registered' && (
                        <div className="admin-create-customer-search">
                            <label>البحث عن العميل بالبريد أو الهاتف</label>

                            <div className="admin-create-search-row">
                                <input
                                    type="search"
                                    value={customerSearch}
                                    onChange={(event) =>
                                        setCustomerSearch(event.target.value)
                                    }
                                    placeholder="البريد الإلكتروني أو رقم الهاتف"
                                />

                                <button
                                    type="button"
                                    onClick={() => void handleCustomerSearch()}
                                    disabled={customerSearching}
                                >
                                    {customerSearching
                                        ? 'جارٍ البحث...'
                                        : 'بحث'}
                                </button>
                            </div>

                            {customerResults.length > 0 && (
                                <div className="admin-create-customer-results">
                                    {customerResults.map((found) => (
                                        <button
                                            type="button"
                                            key={found.uid}
                                            onClick={() => selectCustomer(found)}
                                        >
                                            <strong>{found.name || 'بدون اسم'}</strong>
                                            <span>{found.email}</span>
                                            <span dir="ltr">{found.phone}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedCustomerId && (
                                <div className="admin-create-selected-customer">
                                    <span>العميل المحدد: {customer.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomerId('')
                                            setCustomer({ ...initialCustomer })
                                        }}
                                    >
                                        تغيير العميل
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="admin-create-customer-fields">
                        <label>
                            اسم العميل
                            <input
                                value={customer.name}
                                onChange={(event) =>
                                    setCustomer((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
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
                                onChange={(event) =>
                                    setCustomer((current) => ({
                                        ...current,
                                        phone: event.target.value,
                                    }))
                                }
                                required
                            />
                        </label>

                        <label>
                            المدينة
                            <input
                                value={customer.city}
                                onChange={(event) =>
                                    setCustomer((current) => ({
                                        ...current,
                                        city: event.target.value,
                                    }))
                                }
                                required
                            />
                        </label>

                        <label>
                            العنوان
                            <input
                                value={customer.address}
                                onChange={(event) =>
                                    setCustomer((current) => ({
                                        ...current,
                                        address: event.target.value,
                                    }))
                                }
                                required
                            />
                        </label>

                        <label className="admin-create-notes">
                            ملاحظات
                            <textarea
                                value={customer.notes}
                                onChange={(event) =>
                                    setCustomer((current) => ({
                                        ...current,
                                        notes: event.target.value,
                                    }))
                                }
                                rows={3}
                            />
                        </label>
                    </div>
                </section>

                {/* المنتجات */}

                <section className="admin-create-section">
                    <div className="admin-create-section-heading">
                        <h3>2. اختيار المنتجات</h3>
                        <p>اختر المنتجات من كتالوج المتجر المنشور.</p>
                    </div>

                    <div className="admin-create-product-controls">
                        <input
                            type="search"
                            value={productSearch}
                            onChange={(event) =>
                                setProductSearch(event.target.value)
                            }
                            placeholder="ابحث عن منتج بالاسم أو العلامة أو SKU..."
                        />

                        <select
                            value={categoryFilter}
                            onChange={(event) =>
                                setCategoryFilter(event.target.value)
                            }
                        >
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category === 'الكل'
                                        ? 'جميع التصنيفات'
                                        : category}
                                </option>
                            ))}
                        </select>
                    </div>

                    {productsLoading ? (
                        <div className="admin-create-message">
                            جارٍ تحميل المنتجات...
                        </div>
                    ) : productsError ? (
                        <div className="admin-create-error">
                            {productsError}
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="admin-create-message">
                            لا توجد منتجات مطابقة للبحث.
                        </div>
                    ) : (
                        <div className="admin-create-products-grid">
                            {filteredProducts.map((product) => (
                                <button
                                    type="button"
                                    className="admin-create-product-card"
                                    key={product.id}
                                    onClick={() => openProduct(product)}
                                >
                                    <div className="admin-create-product-image">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                            />
                                        ) : (
                                            <span>📦</span>
                                        )}
                                    </div>

                                    <div className="admin-create-product-info">
                                        <strong>{product.name}</strong>
                                        <span>{product.category}</span>
                                        <b>{formatPrice(product.price)}</b>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {/* نافذة خيارات المنتج */}

                {selectedProduct && (
                    <div className="admin-create-product-overlay">
                        <div className="admin-create-product-dialog">
                            <button
                                type="button"
                                className="admin-create-dialog-close"
                                onClick={closeProduct}
                            >
                                ×
                            </button>

                            <div className="admin-create-dialog-product">
                                {selectedProduct.image && (
                                    <img
                                        src={selectedProduct.image}
                                        alt={selectedProduct.name}
                                    />
                                )}

                                <div>
                                    <h3>{selectedProduct.name}</h3>
                                    <p>{selectedProduct.category}</p>
                                    <strong>
                                        السعر الأساسي: {formatPrice(selectedProduct.price)}
                                    </strong>
                                </div>
                            </div>

                            {Boolean(selectedProduct.colors?.length) && (
                                <label>
                                    اللون
                                    <select
                                        value={selectedColorId}
                                        onChange={(event) =>
                                            setSelectedColorId(event.target.value)
                                        }
                                    >
                                        <option value="">اختر اللون</option>
                                        {selectedProduct.colors?.map((color) => (
                                            <option
                                                key={color.id}
                                                value={color.id}
                                            >
                                                {color.name}: {color.value}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            {Boolean(selectedProduct.sizes?.length) && (
                                <label>
                                    المقاس
                                    <select
                                        value={selectedSizeId}
                                        onChange={(event) =>
                                            setSelectedSizeId(event.target.value)
                                        }
                                    >
                                        <option value="">اختر المقاس</option>
                                        {selectedProduct.sizes?.map((size) => (
                                            <option
                                                key={size.id}
                                                value={size.id}
                                            >
                                                {size.name}: {size.value}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            <label>
                                سعر الوحدة
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={selectedPrice}
                                    onChange={(event) =>
                                        setSelectedPrice(event.target.value)
                                    }
                                />
                            </label>

                            <label>
                                الكمية
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={selectedQuantity}
                                    onChange={(event) =>
                                        setSelectedQuantity(
                                            Number(event.target.value)
                                        )
                                    }
                                />
                            </label>

                            <button
                                type="button"
                                className="admin-create-add-product"
                                onClick={addSelectedProduct}
                            >
                                إضافة إلى الطلب
                            </button>
                        </div>
                    </div>
                )}

                {/* ملخص الطلب */}

                <section className="admin-create-section">
                    <div className="admin-create-section-heading">
                        <h3>3. المنتجات المختارة وملخص الطلب</h3>
                        <p>يمكنك تعديل الكمية وسعر الوحدة قبل الحفظ.</p>
                    </div>

                    {items.length === 0 ? (
                        <div className="admin-create-message">
                            لم تتم إضافة أي منتجات بعد.
                        </div>
                    ) : (
                        <div className="admin-create-selected-items">
                            {items.map((item, index) => (
                                <div
                                    className="admin-create-selected-item"
                                    key={`${item.variantKey}_${index}`}
                                >
                                    <div className="admin-create-selected-image">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} />
                                        ) : (
                                            <span>📦</span>
                                        )}
                                    </div>

                                    <div className="admin-create-selected-info">
                                        <strong>{item.name}</strong>

                                        <span>
                                            {[item.selectedColor, item.selectedSize]
                                                .filter(Boolean)
                                                .map((variant) =>
                                                    `${variant?.name}: ${variant?.value}`
                                                )
                                                .join(' · ') || 'بدون خيارات'}
                                        </span>

                                        <label>
                                            سعر الوحدة
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.price}
                                                onChange={(event) =>
                                                    updateItemPrice(
                                                        index,
                                                        Number(event.target.value)
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
                                                onChange={(event) =>
                                                    updateItemQuantity(
                                                        index,
                                                        Number(event.target.value)
                                                    )
                                                }
                                            />
                                        </label>

                                        <b>
                                            الإجمالي: {formatPrice(
                                                item.price * item.quantity
                                            )}
                                        </b>
                                    </div>

                                    <button
                                        type="button"
                                        className="admin-create-remove-item"
                                        onClick={() => removeItem(index)}
                                    >
                                        حذف
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="admin-create-order-fields">
                        <label>
                            رسوم الشحن (ر.س)
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={shippingFee}
                                onChange={(event) =>
                                    setShippingFee(event.target.value)
                                }
                            />
                        </label>

                        <label>
                            طريقة الدفع
                            <select
                                value={paymentMethod}
                                onChange={(event) =>
                                    setPaymentMethod(event.target.value)
                                }
                            >
                                <option value="الدفع عند الاستلام">
                                    الدفع عند الاستلام
                                </option>
                                <option value="تحويل بنكي">
                                    تحويل بنكي
                                </option>
                                <option value="دفع إلكتروني">
                                    دفع إلكتروني
                                </option>
                            </select>
                        </label>

                        <label>
                            حالة الطلب
                            <select
                                value={status}
                                onChange={(event) =>
                                    setStatus(event.target.value as OrderStatus)
                                }
                            >
                                {orderStatuses.map((orderStatus) => (
                                    <option
                                        key={orderStatus}
                                        value={orderStatus}
                                    >
                                        {orderStatus}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="admin-create-totals">
                        <div>
                            <span>مجموع المنتجات</span>
                            <strong>{formatPrice(subtotal)}</strong>
                        </div>

                        <div>
                            <span>رسوم الشحن</span>
                            <strong>{formatPrice(shipping)}</strong>
                        </div>

                        <div className="admin-create-grand-total">
                            <span>الإجمالي النهائي</span>
                            <strong>{formatPrice(total)}</strong>
                        </div>
                    </div>
                </section>

                <div className="admin-create-actions">
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={saving}
                    >
                        إلغاء
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                    >
                        {saving ? 'جارٍ إنشاء الطلب...' : 'إنشاء الطلب'}
                    </button>
                </div>

            </form>
        </div>
    )
}

export default AdminCreateOrder
