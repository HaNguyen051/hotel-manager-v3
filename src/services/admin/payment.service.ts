// ==================== src/services/admin/payment.service.ts ====================
import { prisma } from "config/client";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

interface CreatePaymentData {
    bookingId: number;
    paymentMethod: PaymentMethod;
    paymentRef?: string;
}

const validatePaymentMethod = (method: string) => {
    const validMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT'];
    if (!validMethods.includes(method)) {
        throw new Error("Phương thức thanh toán không hợp lệ");
    }
};

const getAllPayments = async () => {
    try {
        const payments = await prisma.payment.findMany({
            include: {
                booking: {
                    include: {
                        roomBookings: { include: { room: true } },
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true,
                                username: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return payments;
    } catch (error) {
        console.error("Error fetching payments:", error);
        throw error;
    }
};

const getPaymentById = async (id: number) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id },
            include: {
                booking: {
                    include: {
                        roomBookings: { include: { room: true } },
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true,
                                username: true
                            }
                        }
                    }
                }
            }
        });
        return payment;
    } catch (error) {
        console.error("Error fetching payment:", error);
        throw error;
    }
};

const getPaymentByBookingId = async (bookingId: number) => {
    try {
        // Dùng findMany + take:1 thay vì findFirst
        const payments = await prisma.payment.findMany({
            where: { bookingId },
            include: { booking: true },
            take: 1
        });
        return payments[0] || null;
    } catch (error) {
        console.error("Error fetching payment by booking:", error);
        throw error;
    }
};

const createPayment = async (data: CreatePaymentData) => {
    try {
        validatePaymentMethod(data.paymentMethod);

        const booking = await prisma.booking.findUnique({
            where: { id: data.bookingId }
        });

        if (!booking) {
            throw new Error("Booking không tồn tại");
        }

        // Kiểm tra payment đang pending có tồn tại
        const existingPayments = await prisma.payment.findMany({
            where: {
                bookingId: data.bookingId,
                paymentStatus: 'PENDING'
            },
            take: 1
        });

        if (existingPayments.length > 0) {
            throw new Error("Booking này đã có payment đang chờ xử lý");
        }

        const payment = await prisma.payment.create({
            data: {
                bookingId: data.bookingId,
                totalAmount: booking.totalPrice,
                paymentMethod: data.paymentMethod,
                paymentStatus: 'PENDING',
                paymentRef: data.paymentRef || null,
                paidAt: null
            },
            include: { booking: true }
        });

        return payment;
    } catch (error) {
        console.error("Error creating payment:", error);
        throw error;
    }
};

const confirmPayment = async (paymentId: number, paymentRef: string) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { booking: true }
        });

        if (!payment) {
            throw new Error("Payment không tồn tại");
        }

        if (payment.paymentStatus === 'SUCCESS') {
            throw new Error("Payment đã hoàn thành");
        }

        if (payment.paymentStatus === 'FAILED') {
            throw new Error("Payment đã thất bại");
        }

        if (!paymentRef) {
            throw new Error("Payment Ref là bắt buộc");
        }

        // Update payment to SUCCESS
        const updated = await prisma.payment.update({
            where: { id: paymentId },
            data: {
                paymentStatus: 'SUCCESS',
                paymentRef: paymentRef,
                paidAt: new Date()
            },
            include: { booking: true }
        });

        // Update booking to CONFIRMED
        await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CONFIRMED' }
        });

        // Update room to BOOKED
        if (payment.booking.roomId) {
            await prisma.room.update({
                where: { id: payment.booking.roomId },
                data: { status: 'BOOKED' }
            });
        }

        return updated;
    } catch (error) {
        console.error("Error confirming payment:", error);
        throw error;
    }
};

const cancelPayment = async (paymentId: number) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId }
        });

        if (!payment) {
            throw new Error("Payment không tồn tại");
        }

        if (['SUCCESS', 'FAILED'].includes(payment.paymentStatus)) {
            throw new Error(
                `Không thể hủy payment ở trạng thái ${payment.paymentStatus}`
            );
        }

        const cancelled = await prisma.payment.update({
            where: { id: paymentId },
            data: { paymentStatus: 'FAILED' }
        });

        return cancelled;
    } catch (error) {
        console.error("Error cancelling payment:", error);
        throw error;
    }
};

export {
    getAllPayments,
    getPaymentById,
    getPaymentByBookingId,
    createPayment,
    confirmPayment,
    cancelPayment
};