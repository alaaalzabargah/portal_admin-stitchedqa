import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Stitched — Share Your Story'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(160deg, #1A1816 0%, #000000 60%)',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Gold accent line */}
                <div
                    style={{
                        width: 60,
                        height: 2,
                        background: '#C5A059',
                        marginBottom: 32,
                        borderRadius: 1,
                    }}
                />

                {/* Brand name */}
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 300,
                        color: '#FDFCF0',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase' as const,
                        marginBottom: 24,
                    }}
                >
                    STITCHED
                </div>

                {/* Tagline */}
                <div
                    style={{
                        fontSize: 28,
                        color: '#C5A059',
                        letterSpacing: '0.15em',
                        fontWeight: 300,
                    }}
                >
                    Share Your Story ♡
                </div>

                {/* Bottom gold line */}
                <div
                    style={{
                        width: 40,
                        height: 1,
                        background: 'rgba(197, 160, 89, 0.3)',
                        marginTop: 32,
                        borderRadius: 1,
                    }}
                />
            </div>
        ),
        { ...size }
    )
}
