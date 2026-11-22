
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useStore } from '../context/useStore'
import type { Product } from '../context/store-context'
import { getProductById } from '../admin/services/productService'

type WhatsAppButtonProps = {
    message?: string
}

const WHATSAPP_NUMBER = '966509139199'

function WhatsAppButton({ message }: WhatsAppButtonProps) {
    const location = useLocation()
    const { getProductPricing } = useStore()

    const [product, setProduct] = useState<Product | null>(null)

    // استخراج رقم المنتج من الرابط
    useEffect(() => {
        let cancelled = false

        async function loadProduct() {
            const isProductPage = location.pathname.startsWith('/product/')

            if (!isProductPage) {
                setProduct(null)
                return
            }

            const routeId = location.pathname
                .split('/')
                .pop()

            const numericId = /^\d+$/.test(routeId ?? '')
                ? routeId
                : routeId?.match(/-(\d+)$/)?.[1]

            const productId = Number(numericId)

            if (
                !Number.isSafeInteger(productId) ||
                productId <= 0
            ) {
                setProduct(null)
                return
            }

            try {
                const result = await getProductById(productId)

                if (!cancelled) {
                    setProduct(
                        result && result.isPublished === true
                            ? result
                            : null
                    )
                }
            } catch (error) {
                console.error(
                    'تعذر تحميل المنتج لرسالة واتساب:',
                    error
                )

                if (!cancelled) {
                    setProduct(null)
                }
            }
        }

        void loadProduct()

        return () => {
            cancelled = true
        }
    }, [location.pathname])

    // إنشاء الرسالة حسب الصفحة الحالية
    let defaultMessage =
        message ??
        'السلام عليكم، أود الاستفسار عن منتجات متجر TREND247.'

    if (product) {
        const pricing = getProductPricing(product)

        const currentPrice = pricing.unitPrice

        const productUrl = window.location.origin + location.pathname

        defaultMessage = [
            'السلام عليكم، مرحبًا TREND247 ',
            '',
            'أرغب بالاستفسار عن المنتج التالي:',
            '',
            ` اسم المنتج: ${product.name}`,
            ` السعر: ${currentPrice.toLocaleString('ar-SA')} ر.س`,
            ` رابط المنتج: ${productUrl}`,
            '',
            'هل المنتج متوفر؟ وشكرًا لكم.',
        ].join('\n')
    }

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(defaultMessage)}`

    return (
        <a
            href={whatsappUrl}
            className="whatsapp-floating-button"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="تواصل معنا عبر واتساب"
            title="تواصل معنا عبر واتساب"
        >
            <svg
                viewBox="0 0 32 32"
                width="27"
                height="27"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                {/* إطار فقاعة واتساب */}
                <path
                    d="M16 3.2C8.9 3.2 3.2 8.85 3.2 15.9
        c0 2.45.7 4.75 2 6.65L3.5 28.5
        l6.15-1.65c1.95 1.05 4.15 1.65 6.35 1.65
        7.05 0 12.8-5.7 12.8-12.6
        C28.8 8.85 23.05 3.2 16 3.2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />

                {/* سماعة الهاتف */}
                <path
                    d="M11.1 9.6c-.5 0-1 .25-1.35.7
        -.65.8-1.15 1.8-1.15 2.9
        0 1.05.4 2.15 1 3.15
        1.65 2.75 4.05 4.9 6.85 6.25
        1.05.55 2.15 1 3.3 1
        .95 0 2-.4 2.75-1.05
        .5-.4.8-.95.8-1.55
        0-.3-.05-.55-.2-.7
        l-2.35-1.1c-.3-.15-.6-.1-.85.15
        l-1.05 1.2c-.2.25-.55.3-.85.15
        -1.6-.8-3.05-1.9-4.2-3.3
        -.2-.3-.2-.65.05-.9
        l.9-1.05c.25-.3.3-.65.15-.95
        l-1.05-2.45c-.2-.45-.55-.7-1.05-.7Z"
                    fill="currentColor"
                />
            </svg>

            <span>تواصل معنا</span>
        </a>
    )
}

export default WhatsAppButton
