// // src/controllers/admin/payment.controller.ts
// import { Request, Response } from "express";
// import {
//     getAllPayments,
//     getPaymentById,
//     getPaymentByBookingId,
//     handleCreatePayment,
//     updatePaymentStatus,
//     updatePaymentMethod,
//     handleDeletePayment,
//     getPaymentStatistics
// } from "services/admin/payment.service";
// import { PaymentMethod, PaymentStatus } from "@prisma/client";
// import { prisma } from "config/client";

// // Get payment list page
// const getPaymentListPage = async (req: Request, res: Response) => {
//     try {
//         const payments = await getAllPayments();
//         const statistics = await getPaymentStatistics();

//         return res.render("admin/payment/show.ejs", {
//             payments,
//             statistics
//         });
//     } catch (error) {
//         console.error("Error getting payments:", error);
//         return res.status(500).send("Internal Server Error");
//     }
// };

// // Get create payment page
// const getCreatePaymentPage = async (req: Request, res: Response) => {
//     try {
//         // Lấy danh sách bookings chưa có payment
//         const bookings = await prisma.booking.findMany({
//             where: {
//                 payment: null,
//                 status: {
//                     in: ["PENDING", "CONFIRMED"]
//                 }
//             },
//             include: {
//                 user: {
//                     select: {
//                         id: true,
//                         username: true,
//                         fullName: true
//                     }
//                 },
//                 roomBookings: {
//                     include: {
//                         room: {
//                             select: {
//                                 name: true
//                             }
//                         }
//                     }
//                 }
//             }
//         });

//         return res.render("admin/payment/create.ejs", {
//             bookings,
//             paymentMethods: Object.values(PaymentMethod),
//             paymentStatuses: Object.values(PaymentStatus)
//         });
//     } catch (error) {
//         console.error("Error getting create payment page:", error);
//         return res.status(500).send("Internal Server Error");
//     }
// };

// // Post create payment
// const postCreatePayment = async (req: Request, res: Response) => {
//     try {
//         const { bookingId, userId, paymentMethod, paymentRef } = req.body;

//         await handleCreatePayment(
//             +bookingId,
//             +userId,
//             paymentMethod as PaymentMethod,
//             paymentRef || undefined
//         );

//         return res.redirect("/admin/payment");
//     } catch (error: any) {
//         console.error("Error creating payment:", error);
//         return res.status(500).send(`Error creating payment: ${error.message}`);
//     }
// };

// // Get view/edit payment page
// const getViewPayment = async (req: Request, res: Response) => {
//     try {
//         const { id } = req.params;
//         const payment = await getPaymentById(id);

//         if (!payment) {
//             return res.status(404).send("Payment not found");
//         }

//         return res.render("admin/payment/detail.ejs", {
//             payment,
//             paymentMethods: Object.values(PaymentMethod),
//             paymentStatuses: Object.values(PaymentStatus)
//         });
//     } catch (error) {
//         console.error("Error getting payment:", error);
//         return res.status(500).send("Internal Server Error");
//     }
// };

// // Post update payment status
// const postUpdatePaymentStatus = async (req: Request, res: Response) => {
//     try {
//         const { id } = req.params;
//         const { status, paymentRef } = req.body;

//         await updatePaymentStatus(
//             id,
//             status as PaymentStatus,
//             paymentRef || undefined
//         );

//         return res.redirect("/admin/payment");
//     } catch (error: any) {
//         console.error("Error updating payment status:", error);
//         return res.status(500).send(`Error: ${error.message}`);
//     }
// };

// // Post update payment method
// const postUpdatePaymentMethod = async (req: Request, res: Response) => {
//     try {
//         const { id } = req.params;
//         const { paymentMethod } = req.body;

//         await updatePaymentMethod(id, paymentMethod as PaymentMethod);
//         return res.redirect("/admin/payment");
//     } catch (error: any) {
//         console.error("Error updating payment method:", error);
//         return res.status(500).send(`Error: ${error.message}`);
//     }
// };

// // Post delete payment
// const postDeletePayment = async (req: Request, res: Response) => {
//     try {
//         const { id } = req.params;
//         await handleDeletePayment(id);
//         return res.redirect("/admin/payment");
//     } catch (error: any) {
//         console.error("Error deleting payment:", error);
//         return res.status(500).send(`Error: ${error.message}`);
//     }
// };

// // Get payment by booking (for creating payment from booking detail page)
// const getPaymentByBooking = async (req: Request, res: Response) => {
//     try {
//         const { bookingId } = req.params;
//         const payment = await getPaymentByBookingId(bookingId);

//         if (!payment) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Payment not found"
//             });
//         }

//         return res.json({
//             success: true,
//             data: payment
//         });
//     } catch (error) {
//         console.error("Error getting payment by booking:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Error getting payment"
//         });
//     }
// };

// export {
//     getPaymentListPage,
//     getCreatePaymentPage,
//     postCreatePayment,
//     getViewPayment,
//     postUpdatePaymentStatus,
//     postUpdatePaymentMethod,
//     postDeletePayment,
//     getPaymentByBooking
// };