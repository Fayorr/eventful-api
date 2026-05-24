import QRCode from 'qrcode';

/**
 * Generates a Base64 QR Code string from the provided data.
 * @param data - The string data to encode (e.g., a ticket ID and signature)
 */
export const generateQRCode = async (data: string): Promise<string> => {
	try {
		const qrDataUrl = await QRCode.toDataURL(data, {
			errorCorrectionLevel: 'H', // High error correction for reliable scanning
			type: 'image/png',
			margin: 1,
			width: 300,
		});
		return qrDataUrl;
	} catch (error) {
		console.error('QR Code Generation Error:', error);
		throw new Error('Failed to generate QR Code');
	}
};
