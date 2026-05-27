import QRCode from 'qrcode';
import cloudinary from '../../config/cloudinary';

export const generateQRCode = async (payload: string): Promise<string> => {
	try {
		// 1. Generate the raw Base64 string of the QR Code
		const qrCodeData = await QRCode.toDataURL(payload);

		// 2. Upload that raw data directly to Cloudinary
		const uploadResponse = await cloudinary.uploader.upload(qrCodeData, {
			folder: 'eventful_tickets', // Creates a clean folder in your Cloudinary account
		});

		// 3. Return the secure URL so ticket.service.ts can save it to MongoDB
		return uploadResponse.secure_url;
	} catch (error) {
		console.error('Cloudinary QR Upload Error:', error);
		throw new Error('Failed to generate and store ticket QR code');
	}
};
