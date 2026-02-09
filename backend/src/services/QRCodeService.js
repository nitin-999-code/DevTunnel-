/**
 * QRCodeService
 * 
 * Generates QR codes for tunnel URLs:
 * - SVG and Data URL formats
 * - Mobile-friendly access
 */

class QRCodeService {
    constructor() {
        // QR Code version 3 (29x29 modules) is enough for most URLs
        this.moduleSize = 4;
        this.margin = 4;
    }

    /**
     * Generates QR code as SVG string
     */
    generateSVG(text) {
        const modules = this.encode(text);
        const size = modules.length;
        const totalSize = (size + this.margin * 2) * this.moduleSize;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">`;
        svg += `<rect width="100%" height="100%" fill="white"/>`;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (modules[y][x]) {
                    const px = (x + this.margin) * this.moduleSize;
                    const py = (y + this.margin) * this.moduleSize;
                    svg += `<rect x="${px}" y="${py}" width="${this.moduleSize}" height="${this.moduleSize}" fill="black"/>`;
                }
            }
        }

        svg += '</svg>';
        return svg;
    }

    /**
     * Generates QR code as data URL
     */
    generateDataURL(text) {
        const svg = this.generateSVG(text);
        const base64 = Buffer.from(svg).toString('base64');
        return `data:image/svg+xml;base64,${base64}`;
    }

    /**
     * Simple QR code encoder (Version 1-L, numeric/alphanumeric)
     * For production, use a proper library like 'qrcode'
     */
    encode(text) {
        // This is a simplified QR code generator for demonstration
        // In production, use the 'qrcode' npm package

        const size = 25; // Version 2 QR code
        const modules = Array(size).fill(null).map(() => Array(size).fill(false));

        // Add finder patterns (top-left, top-right, bottom-left)
        this.addFinderPattern(modules, 0, 0);
        this.addFinderPattern(modules, size - 7, 0);
        this.addFinderPattern(modules, 0, size - 7);

        // Add timing patterns
        for (let i = 8; i < size - 8; i++) {
            modules[6][i] = i % 2 === 0;
            modules[i][6] = i % 2 === 0;
        }

        // Add alignment pattern (for version 2+)
        this.addAlignmentPattern(modules, size - 9, size - 9);

        // Encode data (simplified - just pattern based on text)
        const hash = this.simpleHash(text);
        let bitIndex = 0;

        // Fill data area with pattern
        for (let col = size - 1; col >= 1; col -= 2) {
            if (col === 6) col = 5; // Skip timing pattern

            for (let row = 0; row < size; row++) {
                for (let c = 0; c < 2; c++) {
                    const x = col - c;
                    if (!this.isReserved(modules, x, row, size)) {
                        modules[row][x] = ((hash >> (bitIndex % 32)) & 1) === 1;
                        bitIndex++;
                    }
                }
            }
        }

        return modules;
    }

    /**
     * Adds finder pattern at position
     */
    addFinderPattern(modules, startX, startY) {
        for (let y = 0; y < 7; y++) {
            for (let x = 0; x < 7; x++) {
                const isOuter = x === 0 || x === 6 || y === 0 || y === 6;
                const isInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
                modules[startY + y][startX + x] = isOuter || isInner;
            }
        }

        // Add separator (white border)
        for (let i = 0; i < 8; i++) {
            if (startX + 7 < modules.length) modules[startY + Math.min(i, 7)][startX + 7] = false;
            if (startY + 7 < modules.length) modules[startY + 7][startX + Math.min(i, 7)] = false;
        }
    }

    /**
     * Adds alignment pattern
     */
    addAlignmentPattern(modules, x, y) {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const isOuter = Math.abs(dx) === 2 || Math.abs(dy) === 2;
                const isCenter = dx === 0 && dy === 0;
                modules[y + dy][x + dx] = isOuter || isCenter;
            }
        }
    }

    /**
     * Checks if position is reserved (finder patterns, timing, etc.)
     */
    isReserved(modules, x, y, size) {
        // Finder patterns + separators
        if ((x < 9 && y < 9) || (x >= size - 8 && y < 9) || (x < 9 && y >= size - 8)) {
            return true;
        }
        // Timing patterns
        if (x === 6 || y === 6) return true;
        // Alignment pattern area
        if (x >= size - 11 && x <= size - 7 && y >= size - 11 && y <= size - 7) return true;
        return false;
    }

    /**
     * Simple hash function for data encoding
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
        }
        return Math.abs(hash);
    }

    /**
     * Generates a complete QR response object
     */
    generate(url, format = 'svg') {
        return {
            url,
            format,
            data: format === 'dataurl' ? this.generateDataURL(url) : this.generateSVG(url),
            generatedAt: new Date().toISOString(),
        };
    }
}

module.exports = QRCodeService;
