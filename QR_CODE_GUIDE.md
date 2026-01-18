# QR Code Generator - Usage Guide

## Access the Generator

The QR code generator is accessible at:
```
https://yourdomain.com/qr
```

**Note:** This page is NOT shown in the navigation - it's accessed via direct link only.

## Basic Usage

Generate a QR code for any URL:
```
/qr?url=https://stitched.bh
```

## Customization Parameters

### Required
- `url` - The URL to encode in the QR code

### Optional Design Parameters
- `size` - Size in pixels (default: 300)
  - Example: `&size=400`

- `dotsColor` - Color of QR code dots (hex)
  - Example: `&dotsColor=%23000000` (black)
  - Example: `&dotsColor=%23C4922B` (gold)

- `backgroundColor` - Background color (hex)
  - Example: `&backgroundColor=%23ffffff` (white)
  - Example: `&backgroundColor=%23F5F0E8` (sand)

- `dotsType` - Style of dots
  - Options: `rounded`, `dots`, `classy`, `classy-rounded`, `square`, `extra-rounded`
  - Example: `&dotsType=rounded`

- `cornersSquareColor` - Color of corner squares (hex)
  - Example: `&cornersSquareColor=%23C4922B`

- `cornersDotColor` - Color of corner dots (hex)
  - Example: `&cornersDotColor=%23000000`

- `logo` - URL to logo image (centers in QR code)
  - Example: `&logo=https://yoursite.com/logo.png`

## Example URLs

### Basic Black QR Code
```
/qr?url=https://stitched.bh
```

### Branded Gold QR Code
```
/qr?url=https://stitched.bh&size=400&dotsColor=%23C4922B&dotsType=rounded&cornersSquareColor=%23000000
```

### QR Code with Logo
```
/qr?url=https://stitched.bh&size=500&dotsColor=%23000000&logo=https://yoursite.com/logo.png
```

### Custom Colors (Sand Background)
```
/qr?url=https://stitched.bh&size=400&dotsColor=%23000000&backgroundColor=%23F5F0E8&dotsType=classy-rounded
```

## Features

1. **Live Preview** - See your QR code design instantly
2. **Download Options** - Save as PNG or SVG
3. **Copy Link** - Share the custom QR code URL
4. **Mobile Friendly** - Works on all devices

## Tips for Best Results

1. **High Contrast** - Use dark dots on light background for best scanning
2. **Adequate Size** - Minimum 250px for print quality
3. **Logo Size** - Keep logos small (automatically sized to 40% of QR code)
4. **Error Correction** - Set to 'H' (high) to allow logo overlay
5. **Testing** - Always test QR codes with multiple devices before printing

## Use Cases

- Customer loyalty cards
- Product packaging
- Marketing materials
- Event tickets
- Business cards
- Menu ordering
- Social media links
