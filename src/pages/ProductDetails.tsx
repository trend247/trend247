
import { useState } from 'react'
import type {
    Product,
    ProductVariant,
} from '../context/store-context'
import { useStore } from '../context/useStore'

type ProductDetailsProps = {
    product: Product
    favorites: number[]
    onBack: () => void
    onAddToCart: (
        product: Product,
        selectedColor?: ProductVariant,
        selectedSize?: ProductVariant,
        quantity?: number
    ) => void
    onToggleFavorite: (id: number) => void
}

function ProductDetails({
    product,
    favorites,
    onBack,
    onAddToCart,
    onToggleFavorite,
}: ProductDetailsProps) {
    const { getProductPricing } = useStore()

    const [activeImage, setActiveImage] = useState(0)
    const [imageFailed, setImageFailed] = useState(false)

    const [selectedColor, setSelectedColor] =
        useState<ProductVariant | undefined>(undefined)

    const [selectedSize, setSelectedSize] =
        useState<ProductVariant | undefined>(undefined)

    const [quantity, setQuantity] = useState(1)
    const [addedMessage, setAddedMessage] = useState(false)

    // =====================================
    // الصور والمعلومات الأساسية
    // =====================================

    const images = Array.from(
        new Set([product.image, ...(product.images ?? [])].filter(Boolean))
    )

    const currentImage = images[activeImage] || product.image
    const isFavorite = favorites.includes(product.id)

    const hasColors = (product.colors?.length ?? 0) > 0
    const hasSizes = (product.sizes?.length ?? 0) > 0

    const needsColor = hasColors && !selectedColor
    const needsSize = hasSizes && !selectedSize

    // =====================================
    // المخزون
    // =====================================

    const availableStocks = [
        product.stock,
        selectedColor?.stock,
        selectedSize?.stock,
    ].filter(
        (stock): stock is number =>
            typeof stock === 'number' && Number.isFinite(stock)
    )

    const availableStock =
        availableStocks.length > 0
            ? Math.max(0, Math.min(...availableStocks))
            : undefined

    const isOutOfStock =
        availableStock !== undefined && availableStock <= 0

    // =====================================
    // حساب الأسعار والعروض
    // =====================================

    const unitPrice =
        selectedSize?.price ??
        selectedColor?.price ??
        product.price

    // حساب السعر من نظام العروض
    const productPricing = getProductPricing(
        product,
        selectedColor,
        selectedSize
    )

    // التحقق من وجود خصم يدوي
    const hasManualDiscount =
        product.oldPrice > product.price &&
        product.oldPrice > 0

    // التحقق من وجود عرض ترويجي
    const hasOfferDiscount =
        productPricing.offerDiscount > 0 &&
        Boolean(productPricing.offerName)

    // إعطاء الأولوية للعرض الترويجي
    const hasDiscount = hasOfferDiscount || hasManualDiscount

    // السعر النهائي
    const displayedPrice = hasOfferDiscount
        ? productPricing.unitPrice
        : unitPrice

    // السعر القديم
    const displayedOldPrice = hasOfferDiscount
        ? productPricing.originalUnitPrice
        : hasManualDiscount
            ? product.oldPrice
            : unitPrice

    // قيمة التوفير
    const savedAmount = Math.max(
        0,
        displayedOldPrice - displayedPrice
    )

    // نسبة الخصم
    const discountPercentage =
        hasDiscount && displayedOldPrice > 0
            ? Math.round(
                (savedAmount / displayedOldPrice) * 100
            )
            : 0

    // اسم العرض
    const offerName = productPricing.offerName

    // =====================================
    // معلومات إضافية
    // =====================================

    const conditionLabels = {
        new: 'جديد',
        used: 'مستعمل',
        refurbished: 'مجدد',
    }

    const formatPrice = (price: number) =>
        `${price.toLocaleString('ar-SA')} ر.س`

    // =====================================
    // التحقق من إمكانية الشراء
    // =====================================

    const canAddToCart =
        !needsColor &&
        !needsSize &&
        !isOutOfStock &&
        (availableStock === undefined || quantity <= availableStock)

    // =====================================
    // إضافة المنتج إلى السلة
    // =====================================

    const handleAddToCart = () => {
        if (!canAddToCart) return

        onAddToCart(
            product,
            selectedColor,
            selectedSize,
            quantity
        )

        setAddedMessage(true)

        window.setTimeout(() => {
            setAddedMessage(false)
        }, 2500)
    }

    // =====================================
    // التحكم بالكمية
    // =====================================

    const decreaseQuantity = () => {
        setQuantity((current) => Math.max(1, current - 1))
    }

    const increaseQuantity = () => {
        setQuantity((current) => {
            if (
                availableStock !== undefined &&
                current >= availableStock
            ) {
                return current
            }

            return current + 1
        })
    }

    // =====================================
    // التحقق من توفر الخيارات
    // =====================================

    const isVariantUnavailable = (variant: ProductVariant) =>
        typeof variant.stock === 'number' && variant.stock <= 0

    return (
        <main className="product-details-page pd-page">
            <div className="pd-container">

                <button className="back-to-store pd-back" onClick={onBack}>
                    → العودة إلى المتجر
                </button>

                <div className="pd-breadcrumb">
                    <button onClick={onBack}>الرئيسية</button>
                    <span>/</span>
                    <span>{product.category}</span>
                    <span>/</span>
                    <strong>{product.name}</strong>
                </div>

                <section className="pd-main">

                    {/* معرض الصور */}
                    <div className="pd-gallery">
                        <div className="pd-main-image">
                            {currentImage && !imageFailed ? (
                                <img
                                    src={currentImage}
                                    alt={product.name}
                                    onError={() => setImageFailed(true)}
                                />
                            ) : (
                                <div className="pd-image-placeholder">
                                    <span>📦</span>
                                    <p>لا تتوفر صورة لهذا المنتج</p>
                                </div>
                            )}

                            {hasDiscount && (
                                <span className="pd-discount">
                                    خصم {discountPercentage}%
                                </span>
                            )}

                            {product.isNew && (
                                <span className="pd-new-badge">
                                    جديد
                                </span>
                            )}

                            <button
                                className={`pd-image-favorite ${isFavorite ? 'active' : ''
                                    }`}
                                onClick={() => onToggleFavorite(product.id)}
                                aria-label="إضافة إلى المفضلة"
                            >
                                {isFavorite ? '♥' : '♡'}
                            </button>
                        </div>

                        {images.length > 1 && (
                            <div className="pd-thumbnails">
                                {images.map((image, index) => (
                                    <button
                                        key={`${image}-${index}`}
                                        className={
                                            activeImage === index ? 'active' : ''
                                        }
                                        onClick={() => {
                                            setActiveImage(index)
                                            setImageFailed(false)
                                        }}
                                    >
                                        <img
                                            src={image}
                                            alt={`${product.name} - صورة ${index + 1}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* معلومات المنتج */}
                    <div className="pd-info">

                        <div className="pd-top-labels">
                            <span className="pd-category">
                                {product.category}
                            </span>

                            {product.isBestSeller && (
                                <span className="pd-best-seller">
                                    ⭐ الأكثر مبيعاً
                                </span>
                            )}
                        </div>

                        <h1 className="pd-title">{product.name}</h1>

                        {product.brand && (
                            <div className="pd-meta">
                                العلامة التجارية:
                                <strong>{product.brand}</strong>
                            </div>
                        )}

                        {product.model && (
                            <div className="pd-meta">
                                الموديل:
                                <strong>{product.model}</strong>
                            </div>
                        )}

                        <div className="pd-rating">
                            <span className="pd-stars">★</span>
                            <strong>{product.rating}</strong>
                            <span>تقييم المنتج</span>
                        </div>

                        {/* السعر */}
                        <div className="pd-price-box">

                            <div className="pd-current-price">
                                {formatPrice(displayedPrice)}
                            </div>

                            {hasDiscount && (
                                <div className="pd-old-price">
                                    <del>
                                        {formatPrice(displayedOldPrice)}
                                    </del>

                                    <span>
                                        وفرت {formatPrice(savedAmount)}
                                    </span>
                                </div>
                            )}

                            {hasDiscount && (
                                <span className="pd-discount-text">
                                    خصم {discountPercentage}%
                                    {hasOfferDiscount && offerName && (
                                        <> · 🏷️ {offerName}</>
                                    )}
                                </span>
                            )}

                            {product.discount && !hasDiscount && (
                                <span className="pd-discount-text">
                                    {product.discount}
                                </span>
                            )}

                            {(selectedColor?.price !== undefined ||
                                selectedSize?.price !== undefined) && (
                                    <small className="pd-selected-price-note">
                                        السعر يتضمن الخيار المحدد
                                    </small>
                                )}

                        </div>

                        {/* المخزون */}
                        <div className="pd-stock-row">
                            <span className={isOutOfStock ? 'out' : 'in'}>
                                <i />
                                {isOutOfStock
                                    ? 'نفدت الكمية'
                                    : 'متوفر للطلب'}
                            </span>

                            {availableStock !== undefined && (
                                <small>
                                    الكمية المتاحة: {availableStock}
                                </small>
                            )}
                        </div>

                        {product.condition && (
                            <div className="pd-condition">
                                حالة المنتج:
                                <strong>
                                    {conditionLabels[product.condition]}
                                </strong>
                            </div>
                        )}

                        {product.description && (
                            <div className="pd-short-description">
                                <h3>عن المنتج</h3>
                                <p>{product.description}</p>
                            </div>
                        )}

                        {/* اختيار اللون */}
                        {hasColors && (
                            <div className="pd-options pd-select-options">
                                <div className="pd-option-heading">
                                    <h3>اختر اللون</h3>

                                    {selectedColor && (
                                        <span>
                                            اللون المختار: {selectedColor.value}
                                        </span>
                                    )}
                                </div>

                                <div className="pd-choice-list">
                                    {product.colors!.map((color) => {
                                        const unavailable =
                                            isVariantUnavailable(color)

                                        return (
                                            <button
                                                type="button"
                                                key={color.id}
                                                className={`pd-choice ${selectedColor?.id === color.id
                                                    ? 'selected'
                                                    : ''
                                                    }`}
                                                disabled={unavailable}
                                                onClick={() => {
                                                    setSelectedColor(color)
                                                    setQuantity(1)
                                                    setAddedMessage(false)
                                                }}
                                            >
                                                <strong>{color.value}</strong>

                                                {color.name && (
                                                    <small>{color.name}</small>
                                                )}

                                                {color.price !== undefined && (
                                                    <small>
                                                        {formatPrice(color.price)}
                                                    </small>
                                                )}

                                                {unavailable && (
                                                    <small>غير متوفر</small>
                                                )}

                                                {selectedColor?.id === color.id && (
                                                    <span className="pd-choice-check">
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>

                                {needsColor && (
                                    <p className="pd-selection-hint">
                                        يرجى اختيار اللون قبل الإضافة إلى السلة
                                    </p>
                                )}
                            </div>
                        )}

                        {/* اختيار المقاس */}
                        {hasSizes && (
                            <div className="pd-options pd-select-options">
                                <div className="pd-option-heading">
                                    <h3>اختر المقاس</h3>

                                    {selectedSize && (
                                        <span>
                                            المقاس المختار: {selectedSize.value}
                                        </span>
                                    )}
                                </div>

                                <div className="pd-choice-list pd-size-list">
                                    {product.sizes!.map((size) => {
                                        const unavailable =
                                            isVariantUnavailable(size)

                                        return (
                                            <button
                                                type="button"
                                                key={size.id}
                                                className={`pd-choice pd-size-choice ${selectedSize?.id === size.id
                                                    ? 'selected'
                                                    : ''
                                                    }`}
                                                disabled={unavailable}
                                                onClick={() => {
                                                    setSelectedSize(size)
                                                    setQuantity(1)
                                                    setAddedMessage(false)
                                                }}
                                            >
                                                <strong>{size.value}</strong>

                                                {size.name && (
                                                    <small>{size.name}</small>
                                                )}

                                                {size.price !== undefined && (
                                                    <small>
                                                        {formatPrice(size.price)}
                                                    </small>
                                                )}

                                                {unavailable && (
                                                    <small>غير متوفر</small>
                                                )}

                                                {selectedSize?.id === size.id && (
                                                    <span className="pd-choice-check">
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>

                                {needsSize && (
                                    <p className="pd-selection-hint">
                                        يرجى اختيار المقاس قبل الإضافة إلى السلة
                                    </p>
                                )}
                            </div>
                        )}

                        {/* اختيار الكمية */}
                        <div className="pd-quantity-section">
                            <h3>الكمية</h3>

                            <div className="pd-quantity-control">
                                <button
                                    type="button"
                                    onClick={decreaseQuantity}
                                    disabled={quantity <= 1}
                                    aria-label="تقليل الكمية"
                                >
                                    −
                                </button>

                                <span>{quantity}</span>

                                <button
                                    type="button"
                                    onClick={increaseQuantity}
                                    disabled={
                                        availableStock !== undefined &&
                                        quantity >= availableStock
                                    }
                                    aria-label="زيادة الكمية"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* أزرار الشراء */}
                        <div className="pd-actions">
                            <button
                                className="pd-add-cart"
                                onClick={handleAddToCart}
                                disabled={!canAddToCart}
                            >
                                {isOutOfStock
                                    ? 'نفدت الكمية'
                                    : needsColor || needsSize
                                        ? 'اختر الخيارات أولاً'
                                        : addedMessage
                                            ? '✓ تمت الإضافة إلى السلة'
                                            : '🛒 أضف إلى السلة'}
                            </button>

                            <button
                                className={`pd-favorite-button ${isFavorite ? 'active' : ''
                                    }`}
                                onClick={() => onToggleFavorite(product.id)}
                            >
                                {isFavorite
                                    ? '♥ في المفضلة'
                                    : '♡ أضف للمفضلة'}
                            </button>
                        </div>

                        {addedMessage && (
                            <p className="pd-added-message">
                                تمت إضافة {quantity} قطعة إلى سلة التسوق بنجاح.
                            </p>
                        )}

                        <div className="pd-benefits">
                            <div>
                                <span>🚚</span>
                                <p>تجربة تسوق سهلة</p>
                            </div>

                            <div>
                                <span>🔒</span>
                                <p>تسوق بثقة</p>
                            </div>

                            <div>
                                <span>✨</span>
                                <p>منتجات مختارة</p>
                            </div>
                        </div>

                    </div>
                </section>

                {/* المواصفات */}
                {product.specifications &&
                    product.specifications.length > 0 && (
                        <section className="pd-specifications">
                            <div className="pd-section-heading">
                                <span>تفاصيل أكثر</span>
                                <h2>مواصفات المنتج</h2>
                            </div>

                            <div className="pd-spec-table">
                                {product.specifications.map((spec) => (
                                    <div
                                        className="pd-spec-row"
                                        key={spec.id}
                                    >
                                        <strong>{spec.name}</strong>
                                        <span>{spec.value}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                {/* معلومات إضافية */}
                {(product.sku ||
                    product.barcode ||
                    product.model ||
                    product.brand) && (
                        <section className="pd-extra-info">
                            <div className="pd-section-heading">
                                <span>معلومات التعريف</span>
                                <h2>بيانات المنتج</h2>
                            </div>

                            <div className="pd-extra-grid">
                                {product.sku && (
                                    <div>
                                        <small>رمز المنتج SKU</small>
                                        <strong>{product.sku}</strong>
                                    </div>
                                )}

                                {product.barcode && (
                                    <div>
                                        <small>الباركود</small>
                                        <strong>{product.barcode}</strong>
                                    </div>
                                )}

                                {product.brand && (
                                    <div>
                                        <small>العلامة التجارية</small>
                                        <strong>{product.brand}</strong>
                                    </div>
                                )}

                                {product.model && (
                                    <div>
                                        <small>الموديل</small>
                                        <strong>{product.model}</strong>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

            </div>
        </main>
    )
}

export default ProductDetails
