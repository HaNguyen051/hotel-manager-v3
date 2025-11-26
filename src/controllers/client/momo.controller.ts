// src/controllers/client/momo.controller.ts
import { Request, Response } from "express";
import { prisma } from "config/client";
import { createMoMoPaymentUrl } from "services/client/momo.service";
import { PaymentMethod, PaymentStatus, BookingStatus } from "@prisma/client";

// 1. Xử lý khi bấm nút "Thanh toán MoMo"
export const initiateMoMoPayment = async (req: Request, res: Response) => {
    const { bookingId } = req.body; // Lấy bookingId từ form
    const bookingIdNum = parseInt(bookingId);

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingIdNum }
        });

        if (!booking) throw new Error("Booking không tồn tại");

        // Gọi service để lấy link thanh toán
        const momoResponse = await createMoMoPaymentUrl(bookingIdNum, booking.totalPrice);

        if (momoResponse && momoResponse.payUrl) {
            // TẠO RECORD PAYMENT TRƯỚC (Status: PENDING)
            // Để lưu lại là user đang cố gắng thanh toán
            await prisma.payment.upsert({
                where: { bookingId: bookingIdNum },
                update: {
                    paymentMethod: PaymentMethod.MOBILE_PAYMENT,
                    paymentStatus: PaymentStatus.PENDING,
                    paymentRef: momoResponse.orderId // Lưu mã đơn hàng MoMo
                },
                create: {
                    bookingId: bookingIdNum,
                    userId: booking.userId,
                    totalAmount: booking.totalPrice,
                    paymentMethod: PaymentMethod.MOBILE_PAYMENT,
                    paymentStatus: PaymentStatus.PENDING,
                    paymentRef: momoResponse.orderId
                }
            });

            // Chuyển hướng người dùng sang trang MoMo
            return res.redirect(momoResponse.payUrl);
        } else {
            throw new Error("Lỗi kết nối MoMo");
        }

    } catch (error: any) {
        console.error(error);
        // Quay lại trang success với thông báo lỗi
        return res.redirect(`/booking/success?id=${bookingId}&error=PaymentFailed`);
    }
};

// 2. Xử lý khi người dùng thanh toán xong và quay lại (Callback)
export const handleMoMoCallback = async (req: Request, res: Response) => {
    console.log("MoMo Callback Query:", req.query); // <--- THÊM DÒNG NÀY
    // MoMo trả về các tham số trên URL (query params)
    const { resultCode, orderId, message } = req.query;

    // orderId chính là cái mình đã lưu vào paymentRef
    const paymentRef = orderId as string;

    try {
        // Tìm payment dựa trên mã đơn hàng MoMo
        const payment = await prisma.payment.findFirst({
            where: { paymentRef: paymentRef }
        });

        if (!payment) return res.redirect('/');

        if (resultCode === '0') {
            // THÀNH CÔNG (errorCode = 0)
            
            // 1. Cập nhật Payment -> SUCCESS
            await prisma.payment.update({
                where: { id: payment.id },
                data: { 
                    paymentStatus: PaymentStatus.SUCCESS,
                    paidAt: new Date()
                }
            });

            // 2. Cập nhật Booking -> CONFIRMED (hoặc CHECKED_IN tùy logic)
            await prisma.booking.update({
                where: { id: payment.bookingId },
                data: { status: BookingStatus.CONFIRMED }
            });
            
            // 3. Cập nhật Phòng -> BOOKED
            const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId }, include: { roomBookings: true }});
            if (booking && booking.roomBookings[0]) {
                 await prisma.room.update({
                     where: { id: booking.roomBookings[0].roomId },
                     data: { status: 'BOOKED' }
                 });
            }

            // Redirect về trang success với thông báo thành công
            req.flash('success_msg', 'Thanh toán MoMo thành công!');
            return res.redirect(`/booking/success?id=${payment.bookingId}`);

        } else {
            // THẤT BẠI
            await prisma.payment.update({
                where: { id: payment.id },
                data: { paymentStatus: PaymentStatus.FAILED }
            });

            req.flash('error_msg', `Thanh toán thất bại: ${message}`);
            return res.redirect(`/booking/success?id=${payment.bookingId}`);
        }

    } catch (error) {
        console.error(error);
        return res.redirect('/');
    }
};