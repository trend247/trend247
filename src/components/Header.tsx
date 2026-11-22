
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useStore } from '../context/useStore'
import { getPublishedProducts } from '../services/productService'

type HeaderProps = {
    cartCount: number
    onOpenCart: () => void
    search: string
    onSearchChange: (value: string) => void
}

function normalizeSearch(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[ًٌٍَُِّْـ]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
}

function Header({
    cartCount,
    onOpenCart,
    search,
    onSearchChange,
}: HeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [cartAnimationKey, setCartAnimationKey] = useState(0)

    const [products, setProducts] = useState<
        Awaited<ReturnType<typeof getPublishedProducts>>
    >([])

    const [productsLoading, setProductsLoading] = useState(true)
    const [productsError, setProductsError] = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)

    const previousCartCount = useRef(cartCount)
    const searchAreaRef = useRef<HTMLDivElement>(null)

    const { favorites } = useStore()
    const favoritesCount = favorites.length
    const hasFavorites = favoritesCount > 0

    const navigate = useNavigate()

    const closeMenu = () => setMenuOpen(false)

    // جلب المنتجات المنشورة من Firestore
    useEffect(() => {
        let isMounted = true

        async function loadProducts() {
            try {
                setProductsLoading(true)
                setProductsError(false)

                const result = await getPublishedProducts()

                if (isMounted) {
                    setProducts(result)
                }
            } catch (error) {
                console.error('Search products error:', error)

                if (isMounted) {
                    setProductsError(true)
                }
            } finally {
                if (isMounted) {
                    setProductsLoading(false)
                }
            }
        }

        loadProducts()

        return () => {
            isMounted = false
        }
    }, [])

    // البحث الفوري في أسماء المنتجات
    const suggestions = useMemo(() => {
        const query = normalizeSearch(search)

        if (!query) return []

        return products
            .filter(product =>
                normalizeSearch(product.name).includes(query)
            )
            .slice(0, 6)
    }, [products, search])

    const showSuggestions =
        searchFocused && search.trim().length > 0

    // إغلاق الاقتراحات عند الضغط خارج مربع البحث
    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (
                searchAreaRef.current &&
                !searchAreaRef.current.contains(event.target as Node)
            ) {
                setSearchFocused(false)
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setSearchFocused(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [])

    // تشغيل تأثير السلة عند زيادة عدد المنتجات فقط
    useEffect(() => {
        if (cartCount > previousCartCount.current) {
            setCartAnimationKey(previous => previous + 1)
        }

        previousCartCount.current = cartCount
    }, [cartCount])

    function openProduct(productId: number) {
        setSearchFocused(false)
        onSearchChange('')
        navigate(`/product/${productId}`)
    }

    return (
        <>
            <div className="top-bar">
                <span>✨ عروض TREND247 مستمرة — تسوق أحدث الترندات الآن</span>
            </div>

            <div className="sticky-header">
                <header className="header">
                    <div className="header-side header-side-right">
                        <button
                            className="header-icon menu-icon"
                            aria-label="فتح القائمة"
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen(true)}
                            type="button"
                        >
                            <span>☰</span>
                        </button>

                        <Link
                            to="/account"
                            className="header-account"
                            aria-label="حسابي"
                            title="حسابي"
                        >
                            <svg
                                className="header-account-icon"
                                viewBox="0 0 24 24"
                                width="23"
                                height="23"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
                            </svg>
                        </Link>

                    </div>

                    <Link className="brand" to="/" aria-label="الرئيسية">
                        <img
                            src={logo}
                            alt="TREND247 ترند247"
                            className="brand-logo"
                        />
                    </Link>

                    <div className="header-side header-side-left">
                        <button
                            className={`header-icon favorite-button ${hasFavorites ? 'has-favorites' : ''}`}
                            aria-label={`المفضلة، ${favoritesCount} منتجات`}
                            title="المفضلة"
                            type="button"
                            onClick={() => navigate('/favorites')}
                        >
                            <span className="header-favorite-heart">
                                {hasFavorites ? '♥' : '♡'}
                            </span>

                            {hasFavorites && (
                                <span className="header-favorite-count">
                                    {favoritesCount}
                                </span>
                            )}
                        </button>

                        <button
                            className="cart-button"
                            onClick={onOpenCart}
                            type="button"
                            aria-label={`السلة، ${cartCount} منتجات`}
                        >
                            <span
                                className="cart-add-glow"
                                key={`glow-${cartAnimationKey}`}
                                aria-hidden="true"
                            />

                            <span
                                className="cart-icon"
                                key={`icon-${cartAnimationKey}`}
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    width="22"
                                    height="22"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M5 8h14l1 13H4L5 8Z" />
                                    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                                </svg>
                            </span>

                            <span className="cart-text">السلة</span>

                            <b
                                className="cart-count"
                                key={`count-${cartAnimationKey}`}
                            >
                                {cartCount}
                            </b>
                        </button>
                    </div>
                </header>

                {/* البحث والاقتراحات */}
                <div className="search-area" ref={searchAreaRef}>
                    <div className="search-wrap">
                        <span className="search-icon">⌕</span>

                        <input
                            type="search"
                            placeholder="ابحث عن منتجك المفضل..."
                            value={search}
                            onFocus={() => setSearchFocused(true)}
                            onChange={event => {
                                onSearchChange(event.target.value)
                                setSearchFocused(true)
                            }}
                            onKeyDown={event => {
                                if (
                                    event.key === 'Enter' &&
                                    suggestions.length > 0
                                ) {
                                    openProduct(suggestions[0].id)
                                }
                            }}
                            aria-label="البحث عن المنتجات"
                            aria-expanded={showSuggestions}
                            aria-autocomplete="list"
                        />

                        {search && (
                            <button
                                type="button"
                                className="search-clear"
                                onClick={() => {
                                    onSearchChange('')
                                    setSearchFocused(true)
                                }}
                                aria-label="مسح البحث"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {showSuggestions && (
                        <div className="search-suggestions" dir="rtl">
                            <div className="search-suggestions-heading">
                                <span>نتائج البحث</span>
                                {!productsLoading && !productsError && (
                                    <small>
                                        {suggestions.length} نتائج
                                    </small>
                                )}
                            </div>

                            {productsLoading ? (
                                <div className="search-suggestions-message">
                                    <span className="search-loading-dot" />
                                    جارٍ البحث عن المنتجات...
                                </div>
                            ) : productsError ? (
                                <div className="search-suggestions-message">
                                    تعذر تحميل المنتجات. حاول مرة أخرى لاحقاً.
                                </div>
                            ) : suggestions.length > 0 ? (
                                <div className="search-suggestions-list">
                                    {suggestions.map(product => (
                                        <button
                                            type="button"
                                            className="search-suggestion-item"
                                            key={product.id}
                                            onClick={() => openProduct(product.id)}
                                        >
                                            <img
                                                src={
                                                    product.image ||
                                                    product.images?.[0] ||
                                                    ''
                                                }
                                                alt={product.name}
                                                loading="lazy"
                                            />

                                            <span className="search-suggestion-info">
                                                <strong>{product.name}</strong>
                                                <small>
                                                    عرض تفاصيل المنتج
                                                </small>
                                            </span>

                                            <span className="search-suggestion-arrow">
                                                ←
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="search-suggestions-message">
                                    <span className="search-empty-icon">⌕</span>
                                    <strong>لا توجد منتجات مطابقة</strong>
                                    <small>
                                        جرّب البحث بكلمات أخرى
                                    </small>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* خلفية القائمة */}
            <div
                className={`menu-overlay ${menuOpen ? 'is-visible' : ''}`}
                onClick={closeMenu}
                aria-hidden="true"
            />

            {/* القائمة الجانبية */}
            <aside
                className={`side-menu ${menuOpen ? 'is-open' : ''}`}
                aria-hidden={!menuOpen}
                dir="rtl"
            >
                <div className="side-menu-header">
                    <Link to="/" onClick={closeMenu}>
                        <img src={logo} alt="TREND247" />
                    </Link>

                    <button
                        className="side-menu-close"
                        onClick={closeMenu}
                        aria-label="إغلاق القائمة"
                        type="button"
                    >
                        ×
                    </button>
                </div>

                <div className="side-menu-welcome">
                    <span>أهلاً بك في</span>
                    <strong>TREND247</strong>
                    <p>كل ما هو ترند في مكان واحد</p>
                </div>

                <nav className="side-menu-links">
                    <Link to="/" onClick={closeMenu}>
                        <span>⌂</span>
                        الرئيسية
                    </Link>

                    <Link to="/cart" onClick={closeMenu}>
                        <span>▢</span>
                        سلة التسوق
                    </Link>

                    <Link to="/account" onClick={closeMenu}>
                        <span>▤</span>
                        طلباتي
                    </Link>

                    <Link to="/favorites" onClick={closeMenu}>
                        <span>♡</span>
                        المنتجات المفضلة
                    </Link>

                    <Link to="/account" onClick={closeMenu}>
                        <span>♙</span>
                        حسابي
                    </Link>

                    <Link to="/products" onClick={closeMenu}>
                        <span>◇</span>
                        اكتشف المنتجات
                    </Link>
                </nav>

                <div className="side-menu-footer">
                    <p>تسوق بسهولة وأمان</p>
                    <span>© TREND247</span>
                </div>
            </aside>
        </>
    )
}

export default Header
