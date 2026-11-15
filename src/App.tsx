import { useState } from 'react'
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import FavoritesPage from './pages/FavoritesPage'
import AccountPage from './pages/AccountPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import LoginPage from './pages/LoginPage'
import AdminApp from './admin/AdminApp'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'
import CategoryProductsPage from './pages/CategoryProductsPage'

import ScrollToTop from './components/ScrollToTop'
import PageTransition from './components/PageTransition'
import Header from './components/Header'

import { useStore } from './context/useStore'

import './App.css'
import logo from './assets/logo.png'

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    cartItems,
    cartCount,
    cartTotal,
    updateQuantity,
    removeFromCart,
  } = useStore()

  const [cartOpen, setCartOpen] = useState(false)
  const [search, setSearch] = useState('')
  // فصل لوحة التحكم عن واجهة المتجر
  if (location.pathname.startsWith('/admin')) {
    return <AdminApp />
  }
  return (
    <>
      <div className="store" lang="ar" dir="rtl">
        <ScrollToTop />

        <PageTransition />

        {/* الهيدر والبحث */}
        <Header
          cartCount={cartCount}
          onOpenCart={() => navigate('/cart')}
          search={search}
          onSearchChange={setSearch}
        />

        {/* صفحات المتجر */}
        <Routes>
          {/* الرئيسية */}
          <Route
            path="/"
            element={<HomePage search={search} />}
          />

          {/* المفضلة */}
          <Route
            path="/favorites"
            element={<FavoritesPage />}
          />
          {/* جميع المنتجات */}
          <Route
            path="/products"
            element={<ProductsPage search={search} />}
          />

          {/* جميع الأقسام */}
          <Route
            path="/categories"
            element={<CategoriesPage />}
          />

          {/* منتجات قسم محدد */}
          <Route
            path="/category/:id"
            element={<CategoryProductsPage search={search} />}
          />

          {/* تفاصيل المنتج */}
          <Route
            path="/product/:id"
            element={<ProductPage />}
          />

          {/* السلة والدفع */}
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />

          {/* الحساب وتسجيل الدخول */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<AccountPage />} />

          {/* صفحة غير موجودة */}
          <Route
            path="*"
            element={
              <main className="product-details-page">
                <h2>عذراً، الصفحة غير موجودة</h2>

                <button
                  className="back-to-store"
                  onClick={() => navigate('/')}
                >
                  العودة إلى المتجر
                </button>
              </main>
            }
          />
        </Routes>

        {/* نافذة السلة الجانبية */}
        {cartOpen && (
          <div
            className="cart-overlay"
            onClick={() => setCartOpen(false)}
          >
            <section
              className="cart-drawer"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="cart-heading">
                <h2>🛒 سلة المشتريات</h2>

                <button onClick={() => setCartOpen(false)}>
                  ✕
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="cart-empty">
                  <span>🛍️</span>
                  <h3>سلتك فارغة</h3>
                  <p>ابدأ بإضافة المنتجات التي أعجبتك.</p>

                  <button onClick={() => setCartOpen(false)}>
                    متابعة التسوق
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cartItems.map((item) => (
                      <article className="cart-item" key={item.id}>
                        <img src={item.image} alt={item.name} />

                        <div className="cart-item-info">
                          <strong>{item.name}</strong>
                          <span>{item.price} ر.س</span>

                          <div className="quantity-controls">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              −
                            </button>

                            <b>{item.quantity}</b>

                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          className="remove-item"
                          onClick={() => removeFromCart(item.id)}
                          aria-label="حذف المنتج"
                        >
                          🗑️
                        </button>
                      </article>
                    ))}
                  </div>

                  <div className="cart-summary">
                    <div>
                      <span>عدد القطع</span>
                      <strong>{cartCount}</strong>
                    </div>

                    <div>
                      <span>الإجمالي</span>
                      <strong>
                        {cartTotal.toLocaleString('en-US')} ر.س
                      </strong>
                    </div>

                    <button
                      className="checkout-button"
                      onClick={() => {
                        setCartOpen(false)
                        navigate('/checkout')
                      }}
                    >
                      متابعة إتمام الطلب
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* الفوتر */}
        <footer className="footer">
          <img
            src={logo}
            alt="TREND247 ترند247"
            className="footer-logo"
          />

          <p>كل ما هو ترند في مكان واحد</p>

          <small>جميع الحقوق محفوظة © TREND247</small>
        </footer>

        {/* شريط التنقل للجوال */}
        <nav className="mobile-nav">
          <a
            className={location.pathname === '/' ? 'current' : ''}
            href="/"
            onClick={(e) => {
              e.preventDefault()
              navigate('/')
            }}
          >
            ⌂
            <small>الرئيسية</small>
          </a>

          <a
            className={
              location.pathname === '/categories' ||
                location.pathname.startsWith('/category/')
                ? 'current'
                : ''
            }
            href="/categories"
            onClick={(e) => {
              e.preventDefault()
              navigate('/categories')
            }}
          >
            ▦
            <small>الأقسام</small>
          </a>

          <a
            className={
              location.pathname === '/products' ? 'current' : ''
            }
            href="/products"
            onClick={(e) => {
              e.preventDefault()
              navigate('/products')
            }}
          >
            ◈
            <small>المنتجات</small>
          </a>

          <a
            className={location.pathname === '/cart' ? 'current' : ''}
            href="/cart"
            onClick={(e) => {
              e.preventDefault()
              navigate('/cart')
            }}
          >
            🛒
            <small>السلة ({cartCount})</small>
          </a>

          <a
            className={location.pathname === '/account' ? 'current' : ''}
            href="/account"
            onClick={(e) => {
              e.preventDefault()
              navigate('/account')
            }}
          >
            ♙
            <small>حسابي</small>
          </a>
        </nav>
      </div>
    </>
  )
}

export default App