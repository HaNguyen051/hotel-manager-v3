// src/services/client/momo.service.ts
import axios from 'axios';
import crypto from 'crypto';

const partnerCode = process.env.MOMO_PARTNER_CODE!;
const accessKey = process.env.MOMO_ACCESS_KEY!;
const secretKey = process.env.MOMO_SECRET_KEY!;
const endpoint = process.env.MOMO_ENDPOINT!;
const redirectUrl = process.env.MOMO_REDIRECT_URL!;
const ipnUrl = process.env.MOMO_IPN_URL!;

export const createMoMoPaymentUrl = async (bookingId: number, amount: number) => {
    const orderInfo = `Thanh toan dat phong #${bookingId}`;
    const requestId = partnerCode + new Date().getTime();
    const orderId = requestId; // Mã đơn hàng phải duy nhất
    const requestType = "payWithATM";
    const extraData = ""; // Pass bookingId here if needed, encoded base64

    // Tạo chữ ký (Signature) theo công thức của MoMo
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

    // Tạo body request
    const requestBody = {
        partnerCode,
        partnerName: "Hotelier Demo",
        storeId: "MomoTestStore",
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        lang: 'vi',
        requestType,
        autoCapture: true,
        extraData,
        signature
    };

    try {
        // Gửi request sang MoMo
        const response = await axios.post(endpoint, requestBody);
        return response.data; // Trả về payUrl (link thanh toán)
    } catch (error) {
        console.error("MoMo Service Error:", error);
        throw new Error("Không thể tạo link thanh toán MoMo.");
    }
};