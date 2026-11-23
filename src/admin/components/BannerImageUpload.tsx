
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'

type BannerImageUploadProps = {
    label: string
    value: string
    onChange: (url: string) => void
    required?: boolean
    aspectRatio: number
    outputWidth: number
    outputHeight: number
}

const CLOUDINARY_URL =
    'https://api.cloudinary.com/v1_1/nwqt8c1a/image/upload'

const UPLOAD_PRESET = 'trend247'
const MAX_FILE_SIZE = 10 * 1024 * 1024

async function createCroppedImage(
    imageSrc: string,
    pixelCrop: Area,
    outputWidth: number,
    outputHeight: number
): Promise<Blob> {
    const image = new Image()
    image.src = imageSrc

    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(
            new Error('تعذر قراءة الصورة')
        )
    })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
        throw new Error('تعذر تجهيز الصورة للقص')
    }

    canvas.width = outputWidth
    canvas.height = outputHeight

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    context.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputWidth,
        outputHeight
    )

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => {
                if (blob) {
                    resolve(blob)
                } else {
                    reject(new Error('تعذر إنشاء الصورة المقصوصة'))
                }
            },
            'image/jpeg',
            0.92
        )
    })
}

export default function BannerImageUpload({
    label,
    value,
    onChange,
    required = false,
    aspectRatio,
    outputWidth,
    outputHeight,
}: BannerImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const objectUrlRef = useRef<string | null>(null)

    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')

    const [imageSrc, setImageSrc] = useState('')
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] =
        useState<Area | null>(null)

    function releaseImage() {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current)
            objectUrlRef.current = null
        }

        setImageSrc('')
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setCroppedAreaPixels(null)
    }

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]

        event.target.value = ''

        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('الملف المحدد ليس صورة صالحة')
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            setError('حجم الصورة يجب ألا يتجاوز 10 ميجابايت')
            return
        }

        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current)
        }

        const objectUrl = URL.createObjectURL(file)

        objectUrlRef.current = objectUrl

        setImageSrc(objectUrl)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setCroppedAreaPixels(null)
        setError('')
    }

    async function handleCropComplete() {
        if (!imageSrc || !croppedAreaPixels || uploading) return

        setUploading(true)
        setError('')

        try {
            const croppedBlob = await createCroppedImage(
                imageSrc,
                croppedAreaPixels,
                outputWidth,
                outputHeight
            )

            const croppedFile = new File(
                [croppedBlob],
                'trend247-banner.jpg',
                { type: 'image/jpeg' }
            )

            const data = new FormData()

            data.append('file', croppedFile)
            data.append('upload_preset', UPLOAD_PRESET)

            const response = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: data,
            })

            const result = await response.json()

            if (!response.ok || !result.secure_url) {
                throw new Error(
                    result.error?.message || 'تعذر رفع الصورة'
                )
            }

            onChange(result.secure_url)
            releaseImage()
            setError('')
        } catch (err) {
            console.error('Banner image upload error:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'حدث خطأ أثناء تجهيز أو رفع الصورة'
            )
        } finally {
            setUploading(false)
        }
    }

    function handleCancelCrop() {
        if (uploading) return
        releaseImage()
    }

    return (
        <div className="admin-banner-upload">

            <div className="admin-banner-upload-heading">
                <span>{label}</span>
                {required && <b>*</b>}
            </div>

            {value ? (
                <div className="admin-banner-upload-preview">
                    <img src={value} alt={`معاينة ${label}`} />

                    <div className="admin-banner-upload-actions">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            استبدال الصورة
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                onChange('')
                                setError('')
                            }}
                            disabled={uploading}
                        >
                            حذف الصورة
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    className="admin-banner-upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    <span className="admin-banner-upload-icon">＋</span>

                    <strong>اختر صورة من جهازك</strong>

                    <small>
                        JPG، PNG، WebP — حتى 10 ميجابايت
                    </small>
                </button>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
                disabled={uploading}
            />

            {uploading && (
                <div className="admin-banner-upload-status">
                    <span className="admin-banner-upload-spinner" />
                    جارٍ تجهيز الصورة ورفعها...
                </div>
            )}

            {error && (
                <div className="admin-banner-upload-error">
                    {error}
                </div>
            )}

            {/* نافذة قص الصورة */}
            {imageSrc && (
                <div className="banner-crop-overlay">
                    <div className="banner-crop-modal">

                        <div className="banner-crop-header">
                            <div>
                                <h3>ضبط وقص صورة البانر</h3>
                                <p>
                                    حرّك الصورة وكبّرها حتى تحصل على أفضل نتيجة
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleCancelCrop}
                                disabled={uploading}
                                aria-label="إغلاق"
                            >
                                ×
                            </button>
                        </div>

                        <div className="banner-crop-workspace">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspectRatio}
                                minZoom={1}
                                maxZoom={3}
                                zoomSpeed={0.15}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={(_, pixels) =>
                                    setCroppedAreaPixels(pixels)
                                }
                                restrictPosition
                                showGrid
                            />
                        </div>

                        <div className="banner-crop-controls">
                            <label>
                                <span>تكبير الصورة</span>
                                <strong>{zoom.toFixed(1)}×</strong>
                            </label>

                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={event =>
                                    setZoom(Number(event.target.value))
                                }
                                disabled={uploading}
                            />
                        </div>

                        <div className="banner-crop-info">
                            <span>
                                المقاس النهائي
                            </span>

                            <strong>
                                {outputWidth} × {outputHeight} px
                            </strong>
                        </div>

                        <div className="banner-crop-footer">
                            <button
                                type="button"
                                className="banner-crop-cancel"
                                onClick={handleCancelCrop}
                                disabled={uploading}
                            >
                                إلغاء
                            </button>

                            <button
                                type="button"
                                className="banner-crop-confirm"
                                onClick={handleCropComplete}
                                disabled={uploading || !croppedAreaPixels}
                            >
                                {uploading
                                    ? 'جارٍ الرفع...'
                                    : 'اعتماد الصورة ورفعها'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}
