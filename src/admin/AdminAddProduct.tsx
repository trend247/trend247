
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './Admin.css'
import type {
    Product,
    ProductVariant,
    ProductSpecification,
} from '../context/store-context'

import {
    getAdminCategories,
} from './services/categoryService'

import type {
    StoreCategory,
} from './services/categoryService'

import {
    addProduct,
    updateProduct,
    getProductById,
} from './services/productService'

function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createSeoSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFC')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}


function AdminAddProduct() {
    const navigate = useNavigate()
    const location = useLocation()

    // استخراج رقم المنتج من مسار الصفحة
    const editMatch = location.pathname.match(
        /\/admin\/products\/edit\/(\d+)\/?$/
    )

    const id = editMatch?.[1]
    const isEditMode = Boolean(id)
    const productId = id ? Number(id) : 0

    // حالات تحميل المنتج
    const [loadingProduct, setLoadingProduct] = useState(isEditMode)
    const [loadFailed, setLoadFailed] = useState(false)
    // التصنيفات المحملة من Firebase
    const [categories, setCategories] = useState<StoreCategory[]>([])
    const [loadingCategories, setLoadingCategories] = useState(true)
    const [categoriesError, setCategoriesError] = useState('')
    // تحميل التصنيفات من Firebase
    useEffect(() => {
        let cancelled = false

        async function loadCategories() {
            try {
                const data = await getAdminCategories()

                if (!cancelled) {
                    setCategories(data)
                    setCategoriesError('')
                }
            } catch (err) {
                console.error('Load product categories error:', err)

                if (!cancelled) {
                    setCategoriesError('تعذر تحميل التصنيفات. تحقق من اتصالك وصلاحيات المدير.')
                }
            } finally {
                if (!cancelled) {
                    setLoadingCategories(false)
                }
            }
        }

        void loadCategories()

        return () => {
            cancelled = true
        }
    }, [])
    // المعلومات الأساسية
    const [name, setName] = useState('')
    const [category, setCategory] = useState('')
    const [description, setDescription] = useState('')
    // تحسين محركات البحث SEO
    const [seoTitle, setSeoTitle] = useState('')
    const [seoSlug, setSeoSlug] = useState('')
    const [seoDescription, setSeoDescription] = useState('')
    const [seoSlugEdited, setSeoSlugEdited] = useState(false)
    const [price, setPrice] = useState('')
    const [oldPrice, setOldPrice] = useState('')
    const [stock, setStock] = useState('0')
    const [rating, setRating] = useState('5')

    // الصور
    const [images, setImages] = useState<string[]>([])
    const [mainImage, setMainImage] = useState(0)
    const [imageUrl, setImageUrl] = useState('')
    const [uploadingImages, setUploadingImages] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')
    // البيانات الإضافية
    const [brand, setBrand] = useState('')
    const [model, setModel] = useState('')
    const [sku, setSku] = useState('')
    const [barcode, setBarcode] = useState('')

    const [condition, setCondition] = useState<
        'new' | 'used' | 'refurbished'
    >('new')

    // الألوان والمقاسات والمواصفات
    const [colors, setColors] = useState<ProductVariant[]>([])
    const [sizes, setSizes] = useState<ProductVariant[]>([])
    const [specifications, setSpecifications] = useState<
        ProductSpecification[]
    >([])

    // التسويق
    const [isPublished, setIsPublished] = useState(false)
    const [isFeatured, setIsFeatured] = useState(false)
    const [isNew, setIsNew] = useState(false)
    const [isBestSeller, setIsBestSeller] = useState(false)
    const [sortOrder, setSortOrder] = useState('0')

    // حالة النموذج
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const discount =
        Number(oldPrice) > Number(price) && Number(oldPrice) > 0
            ? Math.round((1 - Number(price) / Number(oldPrice)) * 100)
            : 0

    // تحميل بيانات المنتج عند فتح صفحة التعديل
    useEffect(() => {
        if (!isEditMode) return
        let cancelled = false

        async function loadProduct() {
            try {
                if (!Number.isInteger(productId) || productId <= 0) {
                    throw new Error('INVALID_PRODUCT_ID')
                }

                const product = await getProductById(productId)

                if (cancelled) return

                if (!product) {
                    setError('لم يتم العثور على المنتج المطلوب')
                    setLoadFailed(true)
                    return
                }

                console.log('بيانات المنتج المحملة:', product)

                // المعلومات الأساسية
                setName(product.name ?? '')
                setCategory(product.category ?? '')
                setDescription(product.description ?? '')
                // بيانات SEO
                setSeoTitle(product.seoTitle ?? '')
                setSeoSlug(
                    product.seoSlug || createSeoSlug(product.name ?? '')
                )
                setSeoDescription(product.seoDescription ?? '')
                setSeoSlugEdited(Boolean(product.seoSlug))
                setPrice(String(product.price ?? ''))
                setOldPrice(String(product.oldPrice ?? ''))
                setStock(String(product.stock ?? 0))
                setRating(String(product.rating ?? 5))

                // الصور
                const productImages = product.images?.length
                    ? product.images
                    : product.image
                        ? [product.image]
                        : []

                setImages(productImages)

                const mainImageIndex = productImages.findIndex(
                    image => image === product.image
                )

                setMainImage(mainImageIndex >= 0 ? mainImageIndex : 0)

                // البيانات الإضافية
                setBrand(product.brand ?? '')
                setModel(product.model ?? '')
                setSku(product.sku ?? '')
                setBarcode(product.barcode ?? '')
                setCondition(product.condition ?? 'new')

                // الخيارات
                setColors(product.colors ?? [])
                setSizes(product.sizes ?? [])
                setSpecifications(product.specifications ?? [])

                // التسويق
                setIsPublished(product.isPublished === true)
                setIsFeatured(product.isFeatured === true)
                setIsNew(product.isNew === true)
                setIsBestSeller(product.isBestSeller === true)
                setSortOrder(String(product.sortOrder ?? 0))

            } catch (err) {
                console.error('Load product error:', err)

                if (!cancelled) {
                    setLoadFailed(true)

                    setError(
                        err instanceof Error &&
                            err.message === 'INVALID_PRODUCT_ID'
                            ? 'رقم المنتج غير صحيح'
                            : 'تعذر تحميل بيانات المنتج. تحقق من اتصالك وصلاحيات المدير.'
                    )
                }
            } finally {
                if (!cancelled) {
                    setLoadingProduct(false)
                }
            }
        }

        void loadProduct()

        return () => {
            cancelled = true
        }
    }, [isEditMode, productId])

    // إضافة صورة من رابط
    function handleAddImage() {
        const url = imageUrl.trim()

        if (!url) {
            setError('يرجى إدخال رابط الصورة')
            return
        }

        if (!/^https?:\/\/.+/i.test(url)) {
            setError('يرجى إدخال رابط صحيح يبدأ بـ https:// أو http://')
            return
        }

        if (images.length >= 8) {
            setError('يمكنك إضافة 8 صور كحد أقصى')
            return
        }

        if (images.includes(url)) {
            setError('هذه الصورة موجودة بالفعل')
            return
        }

        setImages(previous => [...previous, url])
        setImageUrl('')
        setError('')
    }


    async function handleUploadImages(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const input = event.currentTarget
        const selectedFiles = Array.from(input.files ?? [])
        input.value = ''

        if (!selectedFiles.length) return

        const remainingSlots = 8 - images.length

        if (remainingSlots <= 0) {
            setError('وصلت إلى الحد الأقصى وهو 8 صور')
            return
        }

        const files = selectedFiles.slice(0, remainingSlots)

        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                setError(`الملف ${file.name} ليس صورة صالحة`)
                return false
            }

            if (file.size > 10 * 1024 * 1024) {
                setError(`حجم الصورة ${file.name} أكبر من 10 ميجابايت`)
                return false
            }

            return true
        })

        if (!validFiles.length) return

        setUploadingImages(true)
        setError('')

        let completed = 0
        let successful = 0
        const failedFiles: string[] = []

        setUploadProgress(`جارٍ رفع ${validFiles.length} صور بالتوازي...`)

        try {
            await Promise.all(
                validFiles.map(async file => {
                    try {
                        const formData = new FormData()

                        formData.append('file', file)
                        formData.append('upload_preset', 'trend247')

                        const response = await fetch(
                            'https://api.cloudinary.com/v1_1/nwqt8c1a/image/upload',
                            {
                                method: 'POST',
                                body: formData,
                            }
                        )

                        const result = await response.json()

                        if (!response.ok || !result.secure_url) {
                            throw new Error(
                                result.error?.message || 'تعذر رفع الصورة'
                            )
                        }

                        // إضافة الصورة فور اكتمال رفعها
                        setImages(previous => [
                            ...previous,
                            result.secure_url,
                        ])

                        successful++

                    } catch (err) {
                        console.error(`Upload failed: ${file.name}`, err)
                        failedFiles.push(file.name)

                    } finally {
                        completed++

                        setUploadProgress(
                            `اكتمل رفع ${completed} من ${validFiles.length} صور`
                        )
                    }
                })
            )

            if (failedFiles.length > 0) {
                setError(
                    `تم رفع ${successful} صور، وتعذر رفع: ${failedFiles.join('، ')}`
                )
            } else {
                setError('')
            }

        } finally {
            setUploadingImages(false)
            setUploadProgress('')
        }
    }


    // حذف صورة
    function removeImage(index: number) {
        setImages(previous => previous.filter((_, i) => i !== index))

        if (index === mainImage) {
            setMainImage(0)
        } else if (index < mainImage) {
            setMainImage(value => value - 1)
        }
    }

    // تحريك صورة
    function moveImage(index: number, direction: number) {
        const target = index + direction

        if (target < 0 || target >= images.length) return

        setImages(previous => {
            const updated = [...previous]
            const [item] = updated.splice(index, 1)
            updated.splice(target, 0, item)
            return updated
        })

        if (mainImage === index) {
            setMainImage(target)
        } else if (mainImage === target) {
            setMainImage(index)
        }
    }

    // الألوان
    function addColor() {
        setColors(previous => [
            ...previous,
            {
                id: createId(),
                name: '',
                value: '',
            },
        ])
    }

    function updateColor(
        id: string,
        field: keyof ProductVariant,
        value: string
    ) {
        setColors(previous =>
            previous.map(item => {
                if (item.id !== id) return item

                if (field === 'price' || field === 'stock') {
                    return {
                        ...item,
                        [field]: value === '' ? undefined : Number(value),
                    }
                }

                return { ...item, [field]: value }
            })
        )
    }

    function removeColor(id: string) {
        setColors(previous => previous.filter(item => item.id !== id))
    }

    // المقاسات
    function addSize() {
        setSizes(previous => [
            ...previous,
            {
                id: createId(),
                name: '',
                value: '',
            },
        ])
    }

    function updateSize(
        id: string,
        field: keyof ProductVariant,
        value: string
    ) {
        setSizes(previous =>
            previous.map(item => {
                if (item.id !== id) return item

                if (field === 'price' || field === 'stock') {
                    return {
                        ...item,
                        [field]: value === '' ? undefined : Number(value),
                    }
                }

                return { ...item, [field]: value }
            })
        )
    }

    function removeSize(id: string) {
        setSizes(previous => previous.filter(item => item.id !== id))
    }

    // المواصفات
    function addSpecification() {
        setSpecifications(previous => [
            ...previous,
            {
                id: createId(),
                name: '',
                value: '',
            },
        ])
    }

    function updateSpecification(
        id: string,
        field: 'name' | 'value',
        value: string
    ) {
        setSpecifications(previous =>
            previous.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        )
    }

    function removeSpecification(id: string) {
        setSpecifications(previous =>
            previous.filter(item => item.id !== id)
        )
    }

    // التحقق من الخيارات
    function validateVariants(items: ProductVariant[]) {
        return items.every(item => {
            if (!item.name.trim() || !item.value.trim()) {
                return false
            }

            if (
                item.price !== undefined &&
                (!Number.isFinite(item.price) || item.price < 0)
            ) {
                return false
            }

            if (
                item.stock !== undefined &&
                (!Number.isInteger(item.stock) || item.stock < 0)
            ) {
                return false
            }

            return true
        })
    }

    // حفظ المنتج: إضافة أو تعديل
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (uploadingImages) {
            setError('انتظر حتى يكتمل رفع الصور قبل حفظ المنتج')
            return
        }
        setError('')

        const currentPrice = Number(price)
        const previousPrice = oldPrice
            ? Number(oldPrice)
            : currentPrice

        const quantity = Number(stock)
        const productRating = Number(rating)
        const order = Number(sortOrder)

        if (!name.trim()) {
            setError('يرجى إدخال اسم المنتج')
            return
        }

        if (!category) {
            setError('يرجى اختيار تصنيف المنتج')
            return
        }
        if (loadingCategories || categoriesError) {
            setError('تعذر التأكد من التصنيفات. أعد تحميل الصفحة وحاول مجددًا.')
            return
        }

        const selectedCategory = categories.find(
            item => item.name === category
        )

        if (!selectedCategory) {
            setError('التصنيف المحدد غير موجود. يرجى اختيار تصنيف آخر.')
            return
        }

        if (!selectedCategory.isActive) {
            setError('هذا التصنيف غير نشط. يرجى اختيار تصنيف نشط.')
            return
        }
        if (
            !Number.isFinite(currentPrice) ||
            currentPrice <= 0 ||
            !Number.isFinite(previousPrice) ||
            previousPrice < currentPrice ||
            !Number.isInteger(quantity) ||
            quantity < 0 ||
            !Number.isFinite(productRating) ||
            productRating < 0 ||
            productRating > 5 ||
            !Number.isInteger(order) ||
            order < 0
        ) {
            setError('يرجى مراجعة السعر والمخزون والتقييم وترتيب المنتج')
            return
        }

        if (!validateVariants(colors) || !validateVariants(sizes)) {
            setError(
                'يرجى إكمال اسم وقيمة كل لون ومقاس والتأكد من صحة السعر والمخزون الاختياري'
            )
            return
        }

        if (
            specifications.some(
                item => !item.name.trim() || !item.value.trim()
            )
        ) {
            setError('يرجى إكمال المواصفات غير المكتملة أو حذفها')
            return
        }

        if (isEditMode && (!Number.isInteger(productId) || productId <= 0)) {
            setError('رقم المنتج غير صحيح')
            return
        }

        try {
            setSaving(true)

            const cleanColors = colors.map(item => ({
                ...item,
                name: item.name.trim(),
                value: item.value.trim(),
            }))

            const cleanSizes = sizes.map(item => ({
                ...item,
                name: item.name.trim(),
                value: item.value.trim(),
            }))

            const cleanSpecifications = specifications.map(item => ({
                ...item,
                name: item.name.trim(),
                value: item.value.trim(),
            }))

            const productData: Omit<Product, 'id'> = {
                name: name.trim(),
                category,
                description: description.trim(),
                seoTitle: seoTitle.trim() || name.trim(),

                seoSlug: createSeoSlug(seoSlug || name),

                seoDescription:
                    seoDescription.trim() || description.trim(),

                price: currentPrice,
                oldPrice: previousPrice,
                rating: productRating,
                discount: discount ? `${discount}%` : '',

                image: images[mainImage] ?? '',
                images,
                stock: quantity,

                isPublished,
                isFeatured,

                brand: brand.trim(),
                model: model.trim(),
                sku: sku.trim(),
                barcode: barcode.trim(),
                condition,

                colors: cleanColors,
                sizes: cleanSizes,
                specifications: cleanSpecifications,

                isNew,
                isBestSeller,
                sortOrder: order,
            }

            if (isEditMode) {
                await updateProduct(productId, productData)
            } else {
                await addProduct(productData)
            }

            navigate('/admin/products', {
                replace: true,
            })

        } catch (err) {
            console.error('Product save error:', err)

            setError(
                isEditMode
                    ? 'تعذر تحديث المنتج. تحقق من اتصالك وصلاحيات المدير.'
                    : 'حدث خطأ أثناء حفظ المنتج. تحقق من اتصالك وصلاحيات المدير.'
            )
        } finally {
            setSaving(false)
        }
    }

    // شاشة تحميل بيانات المنتج
    if (loadingProduct) {
        return (
            <div className="admin-add-product" dir="rtl">
                <div className="admin-products-state">
                    <div className="admin-products-spinner" />
                    <p>جارٍ تحميل بيانات المنتج...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-add-product" dir="rtl">
            <div className="admin-add-product-heading">
                <div>
                    <span className="admin-product-eyebrow">
                        كتالوج المتجر / المنتجات
                    </span>

                    <h2>
                        {isEditMode ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                    </h2>

                    <p>
                        {isEditMode
                            ? 'حدّث بيانات المنتج واحفظ التغييرات'
                            : 'أضف منتجًا جديدًا إلى TREND247 بكل تفاصيله'}
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-add-back"
                    onClick={() => navigate('/admin/products')}
                >
                    ← العودة للمنتجات
                </button>
            </div>

            {error && (
                <div className="admin-form-error">
                    {error}
                </div>
            )}

            {loadFailed ? (
                <div className="admin-products-state">
                    <p>لم نتمكن من تحميل بيانات هذا المنتج.</p>

                    <button
                        type="button"
                        className="admin-add-back"
                        onClick={() => navigate('/admin/products')}
                    >
                        العودة إلى المنتجات
                    </button>
                </div>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="admin-product-form"
                >
                    {/* 01 المعلومات الأساسية */}
                    <section className="admin-form-section">
                        <div className="admin-section-heading">
                            <span className="admin-section-number">01</span>
                            <div>
                                <h3>المعلومات الأساسية</h3>
                                <p>اسم المنتج والتفاصيل التي ستظهر للعملاء</p>
                            </div>
                        </div>

                        <label className="admin-field">
                            <span>اسم المنتج <b>*</b></span>
                            <input
                                value={name}
                                onChange={e => {
                                    const value = e.target.value
                                    setName(value)

                                    if (!seoSlugEdited) {
                                        setSeoSlug(createSeoSlug(value))
                                    }
                                }}
                                placeholder="اسم المنتج"
                                required
                            />
                        </label>

                        <label className="admin-field">
                            <span>وصف المنتج</span>
                            <textarea
                                rows={5}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="اكتب وصفًا جذابًا للمنتج..."
                            />
                        </label>
                    </section>

                    {/* 02 التصنيف */}
                    <section className="admin-form-section">
                        <div className="admin-section-heading">
                            <span className="admin-section-number">02</span>
                            <div>
                                <h3>تصنيف المنتج</h3>
                                <p>اختر التصنيف الذي ينتمي إليه المنتج</p>
                            </div>
                        </div>

                        {loadingCategories ? (
                            <div className="admin-products-state">
                                <div className="admin-products-spinner" />
                                <p>جارٍ تحميل التصنيفات...</p>
                            </div>
                        ) : categoriesError ? (
                            <div className="admin-form-error">
                                {categoriesError}
                            </div>
                        ) : (
                            <>
                                {categories.filter(item => item.isActive).length > 0 ? (
                                    <div className="admin-category-grid">
                                        {categories
                                            .filter(item => item.isActive || item.name === category)
                                            .map(item => (
                                                <button
                                                    type="button"
                                                    key={item.id}
                                                    className={`admin-category-option ${category === item.name ? 'selected' : ''}`}
                                                    onClick={() => setCategory(item.name)}
                                                >
                                                    <img src={item.image} alt="" />

                                                    <span className="admin-category-icon">
                                                        {item.icon}
                                                    </span>

                                                    <strong>{item.name}</strong>

                                                    {!item.isActive && (
                                                        <small>تصنيف غير نشط (قديم)</small>
                                                    )}

                                                    {category === item.name && (
                                                        <span className="admin-category-check">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="admin-category-hint">
                                        لا توجد تصنيفات نشطة حاليًا. أضف تصنيفًا أو فعّل تصنيفًا من لوحة التحكم.
                                    </div>
                                )}
                            </>
                        )}
                    </section>

                    {/* 03 الصور */}
                    <section className="admin-form-section">
                        <div className="admin-section-heading">
                            <span className="admin-section-number">03</span>
                            <div>
                                <h3>صور المنتج</h3>
                                <p>أضف الصور أو احذفها أو غيّر الصورة الرئيسية</p>
                            </div>
                        </div>

                        <div className="admin-image-url-box">
                            <label className="admin-field">
                                <span>رفع الصور من جهازك</span>

                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={uploadingImages || images.length >= 8}
                                    onChange={handleUploadImages}
                                />
                            </label>
                        </div>

                        {uploadingImages && (
                            <div className="admin-upload-note">
                                {uploadProgress}
                            </div>
                        )}

                        <div className="admin-image-url-box">
                            <label className="admin-field">
                                <span>رابط الصورة</span>
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleAddImage()
                                        }
                                    }}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </label>

                            <button
                                type="button"
                                className="admin-add-option"
                                onClick={handleAddImage}
                                disabled={images.length >= 8}
                            >
                                + إضافة الصورة
                            </button>
                        </div>

                        <p className="admin-upload-note">
                            يمكنك إضافة حتى 8 صور للمنتج.
                        </p>

                        {images.length > 0 ? (
                            <div className="admin-image-gallery">
                                {images.map((url, index) => (
                                    <div
                                        className={`admin-image-item ${mainImage === index ? 'main' : ''}`}
                                        key={`${url}-${index}`}
                                    >
                                        <img
                                            src={url}
                                            alt={`صورة المنتج ${index + 1}`}
                                        />

                                        {mainImage === index && (
                                            <span className="admin-main-image-label">
                                                الصورة الرئيسية
                                            </span>
                                        )}

                                        <div className="admin-image-actions">
                                            <button
                                                type="button"
                                                title="تحديد كصورة رئيسية"
                                                onClick={() => setMainImage(index)}
                                            >
                                                ★
                                            </button>

                                            <button
                                                type="button"
                                                title="تحريك للأعلى"
                                                onClick={() => moveImage(index, -1)}
                                            >
                                                ↑
                                            </button>

                                            <button
                                                type="button"
                                                title="تحريك للأسفل"
                                                onClick={() => moveImage(index, 1)}
                                            >
                                                ↓
                                            </button>

                                            <button
                                                type="button"
                                                title="حذف الصورة"
                                                onClick={() => removeImage(index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="admin-category-hint">
                                لم تتم إضافة أي صورة حتى الآن
                            </div>
                        )}
                    </section>

                    {/* 04 السعر والمخزون */}
                    <section className="admin-form-section">
                        <div className="admin-section-heading">
                            <span className="admin-section-number">04</span>
                            <div>
                                <h3>السعر والمخزون</h3>
                                <p>حدد أسعار البيع والكمية المتوفرة</p>
                            </div>
                        </div>

                        <div className="admin-form-grid">
                            <label className="admin-field">
                                <span>سعر البيع <b>*</b></span>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    required
                                />
                            </label>

                            <label className="admin-field">
                                <span>السعر قبل التخفيض</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={oldPrice}
                                    onChange={e => setOldPrice(e.target.value)}
                                />
                            </label>

                            <label className="admin-field">
                                <span>الكمية المتوفرة <b>*</b></span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={stock}
                                    onChange={e => setStock(e.target.value)}
                                    required
                                />
                            </label>

                            <label className="admin-field">
                                <span>التقييم</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    step="0.1"
                                    value={rating}
                                    onChange={e => setRating(e.target.value)}
                                />
                            </label>
                        </div>

                        {discount > 0 && (
                            <div className="admin-discount-preview">
                                <span>نسبة التخفيض المحسوبة</span>
                                <strong>{discount}%</strong>
                            </div>
                        )}
                    </section>

                    {/* 05 البيانات الإضافية */}
                    <section className="admin-form-section">
                        <div className="admin-section-heading">
                            <span className="admin-section-number">05</span>
                            <div>
                                <h3>بيانات إضافية</h3>
                                <p>معلومات تعريفية للمنتج</p>
                            </div>
                        </div>

                        <div className="admin-form-grid">
                            <label className="admin-field">
                                <span>العلامة التجارية</span>
                                <input
                                    value={brand}
                                    onChange={e => setBrand(e.target.value)}
                                    placeholder="مثال: Samsung"
                                />
                            </label>

                            <label className="admin-field">
                                <span>الموديل</span>
                                <input
                                    value={model}
                                    onChange={e => setModel(e.target.value)}
                                />
                            </label>

                            <label className="admin-field">
                                <span>رقم SKU</span>
                                <input
                                    value={sku}
                                    onChange={e => setSku(e.target.value)}
                                />
                            </label>

                            <label className="admin-field">
                                <span>الباركود</span>
                                <input
                                    value={barcode}
                                    onChange={e => setBarcode(e.target.value)}
                                />
                            </label>

                            <label className="admin-field">
                                <span>حالة المنتج</span>
                                <select
                                    value={condition}
                                    onChange={e =>
                                        setCondition(
                                            e.target.value as 'new' | 'used' | 'refurbished'
                                        )
                                    }
                                >
                                    <option value="new">جديد</option>
                                    <option value="used">مستعمل</option>
                                    <option value="refurbished">مجدد</option>
                                </select>
                            </label>
                        </div>
                    </section>

                    {/* 06 الألوان */}
                    <section className="admin-form-section">
                        <div className="admin-section-heading">
                            <span className="admin-section-number">06</span>
                            <div>
                                <h3>ألوان المنتج</h3>
                                <p>أضف الألوان المتاحة</p>
                            </div>
                        </div>

                        {colors.map((color, index) => (
                            <div className="admin-variant-card" key={color.id}>
                                <div className="admin-variant-card-heading">
                                    <strong>اللون {index + 1}</strong>

                                    <button
                                        type="button"
                                        className="admin-remove-option"
                                        onClick={() => removeColor(color.id)}
                                    >
                                        حذف اللون ×
                                    </button>
                                </div>

                                <div className="admin-form-grid">
                                    <label className="admin-field">
                                        <span>اسم اللون</span>
                                        <input
                                            value={color.name}
                                            onChange={e =>
                                                updateColor(color.id, 'name', e.target.value)
                                            }
                                            placeholder="اللون"
                                        />
                                    </label>

                                    <label className="admin-field">
                                        <span>قيمة اللون</span>
                                        <input
                                            value={color.value}
                                            onChange={e =>
                                                updateColor(color.id, 'value', e.target.value)
                                            }
                                            placeholder="أسود أو #000000"
                                        />
                                    </label>

                                    <label className="admin-field">
                                        <span>السعر (اختياري)</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={color.price ?? ''}
                                            onChange={e =>
                                                updateColor(color.id, 'price', e.target.value)
                                            }
                                        />
                                    </label>

                                    <label className="admin-field">
                                        <span>المخزون (اختياري)</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={color.stock ?? ''}
                                            onChange={e =>
                                                updateColor(color.id, 'stock', e.target.value)
                                            }
                                        />
                                    </label>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            className="admin-add-option"
                            onClick={addColor}
                        >
                            + إضافة لون
                        </button>
                    </section>

                    {/* 07 المقاسات */}
                    <section className="admin-form-section">
                        <div className="admin-section-heading">
                            <span className="admin-section-number">07</span>
                            <div>
                                <h3>مقاسات المنتج</h3>
                                <p>أضف المقاسات المتاحة</p>
                            </div>
                        </div>

                        {sizes.map((size, index) => (
                            <div className="admin-variant-card" key={size.id}>
                                <div className="admin-variant-card-heading">
                                    <strong>المقاس {index + 1}</strong>

                                    <button
                                        type="button"
                                        className="admin-remove-option"
                                        onClick={() => removeSize(size.id)}
                                    >
                                        حذف المقاس ×
                                    </button>
                                </div>

                                <div className="admin-form-grid">
                                    <label className="admin-field">
                                        <span>نوع المقاس</span>
                                        <input
                                            value={size.name}
                                            onChange={e =>
                                                updateSize(size.id, 'name', e.target.value)
                                            }
                                            placeholder="المقاس"
                                        />
                                    </label>

                                    <label className="admin-field">
                                        <span>قيمة المقاس</span>
                                        <input
                                            value={size.value}
                                            onChange={e =>
                                                updateSize(size.id, 'value', e.target.value)
                                            }
                                            placeholder="XL أو 42"
                                        />
                                    </label>

                                    <label className="admin-field">
                                        <span>السعر (اختياري)</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={size.price ?? ''}
                                            onChange={e =>
                                                updateSize(size.id, 'price', e.target.value)
                                            }
                                        />
                                    </label>

                                    <label className="admin-field">
                                        <span>المخزون (اختياري)</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={size.stock ?? ''}
                                            onChange={e =>
                                                updateSize(size.id, 'stock', e.target.value)
                                            }
                                        />
                                    </label>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            className="admin-add-option"
                            onClick={addSize}
                        >
                            + إضافة مقاس
                        </button>
                    </section>

                    {/* 08 المواصفات */}
                    <section className="admin-form-section">
                        <div className="admin-section-heading">
                            <span className="admin-section-number">08</span>
                            <div>
                                <h3>مواصفات المنتج</h3>
                                <p>أضف الخصائص التفصيلية للمنتج</p>
                            </div>
                        </div>

                        {specifications.map((item, index) => (
                            <div className="admin-specification-row" key={item.id}>
                                <label className="admin-field">
                                    <span>اسم المواصفة {index + 1}</span>
                                    <input
                                        value={item.name}
                                        onChange={e =>
                                            updateSpecification(item.id, 'name', e.target.value)
                                        }
                                        placeholder="مثال: المادة"
                                    />
                                </label>

                                <label className="admin-field">
                                    <span>القيمة</span>
                                    <input
                                        value={item.value}
                                        onChange={e =>
                                            updateSpecification(item.id, 'value', e.target.value)
                                        }
                                        placeholder="مثال: ألومنيوم"
                                    />
                                </label>

                                <button
                                    type="button"
                                    className="admin-remove-option"
                                    onClick={() => removeSpecification(item.id)}
                                >
                                    حذف ×
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            className="admin-add-option"
                            onClick={addSpecification}
                        >
                            + إضافة مواصفة
                        </button>
                    </section>
                    {/* 10 تحسين محركات البحث SEO */}
                    <section className="admin-form-section">
                        <div className="admin-section-heading">
                            <span className="admin-section-number">10</span>
                            <div>
                                <h3>تحسين محركات البحث (SEO)</h3>
                                <p>
                                    خصص عنوان المنتج ورابطه ووصفه لمحركات البحث ومواقع التواصل
                                </p>
                            </div>
                        </div>

                        <label className="admin-field">
                            <span>عنوان SEO</span>
                            <input
                                value={seoTitle}
                                onChange={e => setSeoTitle(e.target.value)}
                                placeholder={name || 'عنوان المنتج في نتائج البحث'}
                                maxLength={70}
                            />
                            <small>
                                {seoTitle.length}/70 حرفًا
                            </small>
                        </label>

                        <label className="admin-field">
                            <span>رابط SEO المخصص</span>
                            <input
                                dir="ltr"
                                value={seoSlug}
                                onChange={e => {
                                    setSeoSlug(e.target.value)
                                    setSeoSlugEdited(true)
                                }}
                                placeholder="product-name"
                                maxLength={100}
                            />
                            <small>
                                يُنشأ تلقائيًا من اسم المنتج، ويمكنك تخصيصه.
                            </small>
                        </label>

                        <label className="admin-field">
                            <span>وصف SEO</span>
                            <textarea
                                rows={4}
                                value={seoDescription}
                                onChange={e => setSeoDescription(e.target.value)}
                                placeholder={description || 'اكتب وصفًا مختصرًا يظهر في نتائج البحث ومعاينة المشاركة'}
                                maxLength={200}
                            />
                            <small>
                                {seoDescription.length}/200 حرفًا
                            </small>
                        </label>

                        <div className="admin-category-hint">
                            <strong>معاينة بيانات المنتج:</strong>
                            <p>
                                {seoTitle.trim() || name || 'اسم المنتج'}
                            </p>
                            <p>
                                {seoDescription.trim() || description || 'وصف المنتج'}
                            </p>
                        </div>
                    </section>
                    {/* 09 التسويق والنشر */}
                    <section className="admin-form-section">
                        <div className="admin-section-heading">
                            <span className="admin-section-number">09</span>
                            <div>
                                <h3>إعدادات العرض والتسويق</h3>
                                <p>تحكم في طريقة ظهور المنتج في المتجر</p>
                            </div>
                        </div>

                        <label className="admin-toggle-field">
                            <input
                                type="checkbox"
                                checked={isFeatured}
                                onChange={e => setIsFeatured(e.target.checked)}
                            />
                            <span>
                                <strong>منتج مميز</strong>
                                <small>تمييز المنتج ضمن المنتجات المميزة.</small>
                            </span>
                        </label>

                        <label className="admin-toggle-field">
                            <input
                                type="checkbox"
                                checked={isNew}
                                onChange={e => setIsNew(e.target.checked)}
                            />
                            <span>
                                <strong>منتج جديد</strong>
                                <small>إظهار علامة المنتج الجديد.</small>
                            </span>
                        </label>

                        <label className="admin-toggle-field">
                            <input
                                type="checkbox"
                                checked={isBestSeller}
                                onChange={e => setIsBestSeller(e.target.checked)}
                            />
                            <span>
                                <strong>الأكثر مبيعًا</strong>
                                <small>تمييز المنتج ضمن الأكثر مبيعًا.</small>
                            </span>
                        </label>

                        <label className="admin-field">
                            <span>ترتيب ظهور المنتج</span>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={sortOrder}
                                onChange={e => setSortOrder(e.target.value)}
                            />
                        </label>

                        <label className="admin-toggle-field">
                            <input
                                type="checkbox"
                                checked={isPublished}
                                onChange={e => setIsPublished(e.target.checked)}
                            />
                            <span>
                                <strong>نشر المنتج</strong>
                                <small>
                                    عند تفعيل هذا الخيار سيظهر المنتج للعملاء.
                                </small>
                            </span>
                        </label>
                    </section>

                    {error && (
                        <div className="admin-form-error">
                            {error}
                        </div>
                    )}

                    <div className="admin-form-actions">
                        <button
                            type="button"
                            className="admin-cancel-button"
                            onClick={() => navigate('/admin/products')}
                            disabled={saving}
                        >
                            إلغاء
                        </button>

                        <button
                            type="submit"
                            className="admin-save-button"
                            disabled={saving || uploadingImages}
                        >
                            {saving
                                ? 'جارٍ الحفظ...'
                                : isEditMode
                                    ? 'حفظ التعديلات'
                                    : 'إضافة المنتج'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}

export default AdminAddProduct
