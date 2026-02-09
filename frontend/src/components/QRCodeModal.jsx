/**
 * QRCodeModal Component
 * 
 * Modal wrapper for TunnelQRCode with:
 * - Real tunnel link QR generation (client-side)
 * - Expiration countdown timer
 * - Share and download options
 */

import React from 'react';
import TunnelQRCode from './TunnelQRCode';

function QRCodeModal({ tunnel, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                className="bg-dark-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <TunnelQRCode tunnel={tunnel} onClose={onClose} />
            </div>
        </div>
    );
}

export default QRCodeModal;
