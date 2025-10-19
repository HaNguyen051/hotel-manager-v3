// ==================== src/controllers/admin/booking.controller.ts ====================
import { Request, Response } from "express";
import {
    getAllBookings,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking,
    getAvailableRooms
} from "../../services/admin/booking.service";
import { BookingStatus } from "@prisma/client";
import { prisma } from "../../config/client";

interface SessionData {
    messages?: string[];
    error?: string;
    oldData?: any;
    [key: string]: any;
}

const clearSessionData = (session: SessionData) => {
    delete session.messages;
    delete session.error;
    delete session.oldData;
};

// --- Hiển thị trang tạo Booking ---
const getCreateBookingPage = async (req: Request, res: Response) => {
    const session = (req.session as SessionData) || {};
    const error = session.error ?? undefined;
    const oldData = session.oldData ?? {};
    clearSessionData(session);

    try {
        const [rooms, users] = await Promise.all([
            getAvailableRooms(),
            prisma.user.findMany({
                where: { role: { name: 'USER' } },
                // FIX: Kiểm tra schema của User model, có thể không có phone
                select: { 
                    id: true, 
                    fullName: true, 
                    username: true,
                    // phone: true  // ❌ Có thể không tồn tại, comment lại
                    // Thay vào đó, lấy thông qua relation nếu cần
                }
            })
        ]);

        console.log("[Controller] Rooms:", rooms.length);
        console.log("[Controller] Users:", users.length);

        return res.render("admin/booking/create", {
            rooms,
            users,
            error,
            oldData,
            user: req.user
        });
    } catch (error: any) {
        console.error("[Controller] ❌ Error getting create booking page:", error.message);
        console.error("[Stack]:", error.stack);
        req.flash('error_msg', `Lỗi tải trang tạo booking: ${error.message}`);
        return res.redirect("/admin/booking");
    }
};

// --- Hiển thị trang danh sách Booking ---
const getAdminBookingPage = async (req: Request, res: Response) => {
    const session = (req.session as SessionData) || {};
    const messages = session.messages ?? [];
    clearSessionData(session);

    try {
        const statusQuery = req.query.status as string | undefined;
        let filterStatus: BookingStatus | 'all' = 'all';

        if (statusQuery && Object.values(BookingStatus).includes(statusQuery as BookingStatus)) {
            filterStatus = statusQuery as BookingStatus;
        }

        const bookings = await getAllBookings(filterStatus !== 'all' ? filterStatus : undefined);

        return res.render("admin/booking/show", {
            bookings,
            messages,
            filterStatus,
            error: undefined,
            user: req.user
        });
    } catch (error: any) {
        console.error("[Controller] ❌ Error getting admin booking page:", error);
        return res.render("admin/booking/show", {
            bookings: [],
            messages: [],
            filterStatus: 'all',
            error: `Lỗi tải danh sách: ${error.message}`,
            user: req.user
        });
    }
};

// --- Xử lý tạo Booking ---
const postCreateBooking = async (req: Request, res: Response) => {
    const {
        guestName, guestPhone, guestEmail, guestCount,
        roomId, checkInDate, checkOutDate, specialRequest, userId
    } = req.body;

    try {
        if (!guestName?.trim() || !guestPhone?.trim() || !roomId || !checkInDate || !checkOutDate || !userId) {
            throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc (*).");
        }

        const parsedUserId = parseInt(userId);
        if (isNaN(parsedUserId)) throw new Error("Người dùng không hợp lệ.");

        const booking = await createBooking({
            guestName: guestName.trim(),
            guestPhone: guestPhone.trim(),
            guestEmail: guestEmail?.trim() || null,
            guestCount: parseInt(guestCount) || 1,
            roomId: parseInt(roomId),
            checkInDate: new Date(checkInDate),
            checkOutDate: new Date(checkOutDate),
            specialRequest: specialRequest?.trim() || null,
            userId: parsedUserId
        });

        req.flash('success_msg', `✅ Tạo booking #${booking.id} thành công!`);
        return res.redirect("/admin/booking");

    } catch (error: any) {
        console.error("[Controller] ❌ Lỗi tạo booking:", error.message);
        const session = (req.session as SessionData) || {};
        session.error = `❌ Lỗi tạo booking: ${error.message}`;
        session.oldData = req.body;
        return res.redirect("/admin/booking/create");
    }
};

// --- Hiển thị trang chi tiết/sửa Booking ---
const getViewBookingPage = async (req: Request, res: Response) => {
    const { id } = req.params;
    const session = (req.session as SessionData) || {};
    const error = session.error ?? undefined;
    clearSessionData(session);

    try {
        const bookingIdNum = parseInt(id);
        if (isNaN(bookingIdNum)) throw new Error("ID booking không hợp lệ.");

        const [booking, rooms, bookingStatuses] = await Promise.all([
            getBookingById(bookingIdNum),
            getAvailableRooms(),
            Promise.resolve(Object.values(BookingStatus))
        ]);

        if (!booking) {
            req.flash('error_msg', `Không tìm thấy booking với ID #${id}.`);
            return res.redirect("/admin/booking");
        }

        return res.render("admin/booking/detail", {
            booking,
            rooms,
            bookingStatuses,
            error,
            user: req.user
        });
    } catch (error: any) {
        console.error("[Controller] ❌ Lỗi xem chi tiết booking:", error);
        req.flash('error_msg', `Lỗi tải chi tiết booking #${id}: ${error.message}`);
        return res.redirect("/admin/booking");
    }
};

// --- Xử lý cập nhật Booking ---
const postUpdateBooking = async (req: Request, res: Response) => {
    console.log("\n========== POST /admin/booking/update ==========");
    console.log("Request body:", req.body);
    
    const {
        id, guestName, guestPhone, guestEmail, guestCount,
        roomId, checkInDate, checkOutDate, specialRequest, status
    } = req.body;

    try {
        // Validate ID
        if (!id) {
            console.log("❌ Missing ID");
            throw new Error("Thiếu ID booking.");
        }

        const bookingIdNum = parseInt(id);
        if (isNaN(bookingIdNum)) {
            console.log("❌ Invalid ID:", id);
            throw new Error("ID booking không hợp lệ.");
        }

        console.log(`✅ Updating booking #${bookingIdNum}`);
        console.log(`   Status: ${status}`);
        console.log(`   Guest: ${guestName}`);

        // Call service
        const result = await updateBooking(bookingIdNum, {
            guestName: guestName?.trim(),
            guestPhone: guestPhone?.trim(),
            guestEmail: guestEmail === undefined ? undefined : (guestEmail?.trim() || null),
            guestCount: guestCount ? parseInt(guestCount) : undefined,
            roomId: roomId ? parseInt(roomId) : undefined,
            checkInDate: checkInDate ? new Date(checkInDate) : undefined,
            checkOutDate: checkOutDate ? new Date(checkOutDate) : undefined,
            specialRequest: specialRequest === undefined ? undefined : (specialRequest?.trim() || null),
            status: status as BookingStatus | undefined
        });

        console.log("✅ Update successful");
        req.flash('success_msg', `✅ Cập nhật booking #${id} thành công!`);
        return res.redirect("/admin/booking");

    } catch (error: any) {
        console.error("❌ Error updating booking:", error.message);
        console.error("Stack:", error.stack);
        
        const session = (req.session as SessionData) || {};
        session.error = `❌ Lỗi: ${error.message}`;
        return res.redirect(`/admin/booking/detail/${id}`);
    }
};

// --- Xử lý xóa Booking ---
const postDeleteBooking = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const bookingIdNum = parseInt(id);
        if (isNaN(bookingIdNum)) throw new Error("ID booking không hợp lệ.");

        await deleteBooking(bookingIdNum);
        req.flash('success_msg', `✅ Xóa booking #${id} thành công!`);
        return res.redirect("/admin/booking");

    } catch (error: any) {
        console.error("[Controller] ❌ Lỗi xóa booking:", error.message);
        req.flash('error_msg', `❌ Lỗi xóa booking #${id}: ${error.message}`);
        return res.redirect("/admin/booking");
    }
};

export {
    getAdminBookingPage,
    getCreateBookingPage,
    postCreateBooking,
    getViewBookingPage,
    postUpdateBooking,
    postDeleteBooking
};