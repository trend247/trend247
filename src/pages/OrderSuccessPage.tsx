
import { useNavigate } from 'react-router-dom'

type SavedOrder = {
    orderId: string
    customer: {
        name: string
        phone: string
        city: string
        address: string
    }
    items: {
        id: number
        name: string
        price: number
        quantity: number
    }[]
    total: number
    paymentMethod: string
}

function OrderSuccessPage() {
    const navigate = useNavigate()

    const savedOrder = localStorage.getItem('trend247-last-order')
    const order: SavedOrder | null = savedOrder
        ? JSON.parse(savedOrder)
        : null

    if (!order) {
        return (
            <main className="shopping-page">
                <h2>لا يوجد طلب لعرضه</h2>
                <button onClick={() => navigate('/')}>العودة إلى المتجر</button>
            </main>
        )
    }

    return (
        <main className="shopping-page success-page">
            <div className="success-icon">✓</div>
            <h1>تم استلام طلبك بنجاح!</h1>
            <p>شكراً لثقتك في TREND247. سنعمل على تجهيز طلبك.</p>

            <section className="success-order-card">
                <h2>تفاصيل الطلب</h2>
                <p>رقم الطلب: <strong>{order.orderId}</strong></p>
                <p>اسم العميل: {order.customer.name}</p>
                <p>رقم الجوال: {order.customer.phone}</p>
                <p>المدينة: {order.customer.city}</p>
                <p>العنوان: {order.customer.address}</p>
                <p>طريقة الدفع: {order.paymentMethod}</p>

                <hr />

                <h3>المنتجات</h3>
                {order.items.map((item) => (
                    <div className="checkout-summary-item" key={item.id}>
                        <span>{item.name} × {item.quantity}</span>
                        <strong>{item.price * item.quantity} ر.س</strong>
                    </div>
                ))}

                <hr />
                <div className="cart-total">
                    <span>الإجمالي</span>
                    <strong>{order.total} ر.س</strong>
                </div>
            </section>

            <button onClick={() => navigate('/')}>العودة إلى المتجر</button>
        </main>
    )
}

export default OrderSuccessPage
