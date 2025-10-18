// ==================== src/controllers/admin/payment.controller.ts ====================
import { Request, Response } from "express";
import {
    getAllPayments,
    getPaymentById,
    getPaymentByBookingId,
    createPayment,
    confirmPayment,
    cancelPayment
} from "services/admin/payment.service";
import { getBookingById as getBookingByIdService } from "services/admin/booking.service";
import { PaymentMethod } from "@prisma/client";


const postCreatePayment = async (req: Request, res: Response) => {
    const { bookingId, paymentMethod } = req.body;
    const { session } = req as any;

    try {
        if (!bookingId || !paymentMethod) {
            throw new Error("Booking và phương thức thanh toán là bắt buộc");
        }

        const booking = await getBookingByIdService(parseInt(bookingId));

        if (!booking) {
            throw new Error("Booking không tồn tại");
        }

        const payment = await createPayment({
            bookingId: parseInt(bookingId),
            paymentMethod: paymentMethod as PaymentMethod
        });

        session.messages = [
            `✅ Tạo payment thành công! Số tiền: ${booking.totalPrice.toLocaleString('vi-VN')}đ`
        ];
        session.save();

        return res.redirect("/admin/payment");
    } catch (error: any) {
        const payments = await getAllPayments();
        session.messages = [`❌ ${error.message}`];
        session.save();

        return res.render("admin/payment/show.ejs", {
            payments,
            error: error.message
        });
    }
};

const getViewPaymentPage = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const payment = await getPaymentById(parseInt(id));

        if (!payment) {
            return res.status(404).render("status/404.ejs", {
                message: "Payment không tồn tại"
            });
        }

        return res.render("admin/payment/detail.ejs", {
            payment,
            error: undefined
        });
    } catch (error: any) {
        console.error("Error:", error);
        return res.status(400).render("status/error.ejs", {
            message: error.message
        });
    }
};

const postConfirmPayment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paymentRef } = req.body;
    const { session } = req as any;

    try {
        if (!paymentRef) {
            throw new Error("Payment Ref là bắt buộc");
        }

        const payment = await confirmPayment(parseInt(id), paymentRef);

        session.messages = [
            `✅ Xác nhận thanh toán thành công! Booking #${payment.bookingId}`
        ];
        session.save();

        return res.redirect("/admin/payment");
    } catch (error: any) {
        session.messages = [`❌ ${error.message}`];
        session.save();

        return res.redirect("/admin/payment");
    }
};

const postCancelPayment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { session } = req as any;

    try {
        await cancelPayment(parseInt(id));

        session.messages = [`✅ Hủy payment thành công!`];
        session.save();

        return res.redirect("/admin/payment");
    } catch (error: any) {
        session.messages = [`❌ ${error.message}`];
        session.save();

        return res.redirect("/admin/payment");
    }
};

export {
    postCreatePayment,
    getViewPaymentPage,
    postConfirmPayment,
    postCancelPayment
};