
const FIREBASE_PROJECT_ID = 'trend-247'

// هذا هو مفتاح Firebase العام المستخدم في إعداد الموقع
const FIREBASE_API_KEY = 'AIzaSyCwTAPQWBQkVCaQYadKGQanuPeJAc9PRQ'

type FirestoreField = {
    stringValue?: string
    booleanValue?: boolean
    arrayValue?: {
        values?: FirestoreField[]
    }
}

type FirestoreDocument = {
    fields?: Record<string, FirestoreField>
}

function getString(
    fields: Record<string, FirestoreField>,
    key: string
): string {
    return fields[key]?.stringValue ?? ''
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

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function isValidImageUrl(value: string) {
    try {
        const url = new URL(value)
        return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
        return false
    }
}

function createHtml(
    title: string,
    description: string,
    image: string,
    canonicalUrl: string,
    status: number
) {
    const safeTitle = escapeHtml(title)
    const safeDescription = escapeHtml(description)
    const safeImage = escapeHtml(image)
    const safeUrl = escapeHtml(canonicalUrl)

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}">
    <meta name="robots" content="index, follow">

    <link rel="canonical" href="${safeUrl}">

    <meta property="og:locale" content="ar_SA">
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="ترند247 | TREND247">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="${safeImage}">
    <meta property="og:image:alt" content="${safeTitle}">
    <meta property="og:url" content="${safeUrl}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="${safeImage}">
</head>
<body>
    <h1>${safeTitle}</h1>
    <p>${safeDescription}</p>
    <img src="${safeImage}" alt="${safeTitle}">
    <a href="${safeUrl}">عرض المنتج في TREND247</a>
</body>
</html>`

    return new Response(html, {
        status,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
            'X-Content-Type-Options': 'nosniff',
        },
    })
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)

    // استخراج رقم المنتج من نهاية الرابط
    const path = requestUrl.searchParams.get('path') ?? ''
    const match = path.match(/(\d+)\/?$/)

    const productId = match?.[1]

    if (!productId) {
        return createHtml(
            'المنتج غير موجود | TREND247',
            'تعذر العثور على المنتج المطلوب.',
            new URL('/logo.png', requestUrl.origin).toString(),
            requestUrl.origin,
            404
        )
    }

    try {
        const firestoreUrl =
            `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
            `/databases/(default)/documents/products/${productId}` +
            `?key=${FIREBASE_API_KEY}`

        const response = await fetch(firestoreUrl, {
            headers: {
                Accept: 'application/json',
            },
        })

        if (!response.ok) {
            if (response.status === 404) {
                return createHtml(
                    'المنتج غير موجود | TREND247',
                    'ربما تم حذف المنتج أو أن الرابط غير صحيح.',
                    new URL('/logo.png', requestUrl.origin).toString(),
                    requestUrl.origin,
                    404
                )
            }

            console.error(
                'Firestore preview request failed:',
                response.status,
                await response.text()
            )

            return new Response('تعذر تحميل معاينة المنتج.', {
                status: 502,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-store',
                },
            })
        }

        const document =
            await response.json() as FirestoreDocument

        const fields = document.fields ?? {}

        // لا نعرض معاينة المنتجات غير المنشورة
        if (fields.isPublished?.booleanValue !== true) {
            return createHtml(
                'المنتج غير متاح | TREND247',
                'هذا المنتج غير متاح حاليًا.',
                new URL('/logo.png', requestUrl.origin).toString(),
                requestUrl.origin,
                404
            )
        }

        const name = getString(fields, 'name') || 'منتج من TREND247'

        const title =
            getString(fields, 'seoTitle').trim() || name

        const description =
            getString(fields, 'seoDescription').trim() ||
            getString(fields, 'description').trim() ||
            'اكتشف المنتج الآن في ترند247.'

        const slug =
            createSeoSlug(getString(fields, 'seoSlug') || name) ||
            'product'

        const canonicalUrl = new URL(
            `/product/${slug}-${productId}`,
            requestUrl.origin
        ).toString()

        const mainImage = getString(fields, 'image')

        const additionalImages =
            fields.images?.arrayValue?.values ?? []

        const firstAdditionalImage =
            additionalImages.find(
                item => typeof item.stringValue === 'string'
            )?.stringValue ?? ''

        const selectedImage =
            mainImage || firstAdditionalImage

        const image = isValidImageUrl(selectedImage)
            ? selectedImage
            : new URL('/logo.png', requestUrl.origin).toString()

        return createHtml(
            title,
            description,
            image,
            canonicalUrl,
            200
        )

    } catch (error) {
        console.error('Product preview error:', error)

        return new Response('حدث خطأ أثناء إنشاء معاينة المنتج.', {
            status: 500,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        })
    }
}
