import { Request, Response } from "express";
import {
    getAllBookings,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking,
    getAvailableRooms
} from "services/admin/booking.service";

const getAdminBookingPage = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const filterStatus = status || 'all';

        const bookings = await getAllBookings(filterStatus as string);
        const { session } = req as any;
        const messages = session?.messages ?? [];

        if (session?.messages) {
            session.messages = [];
            session.save();
        }

        return res.render("admin/booking/show.ejs", {
            bookings,
            messages,
            filterStatus,
            error: undefined
        });
    } catch (error: any) {
        console.error("Error:", error);
        return res.render("admin/booking/show.ejs", {
            bookings: [],
            messages: [],
            filterStatus: 'all',
            error: error.message
        });
    }
};

const getCreateBookingPage = async (req: Request, res: Response) => {
    try {
        const rooms = await getAvailableRooms();
        return res.render("admin/booking/create.ejs", {
            rooms,
            error: undefined
        });
    } catch (error: any) {
        return res.render("admin/booking/create.ejs", {
            rooms: [],
            error: error.message
        });
    }
};

const postCreateBooking = async (req: Request, res: Response) => {
    const {
        guestName,
        guestPhone,
        guestEmail,
        guestCount,
        roomId,
        checkInDate,
        checkOutDate,
        specialRequest,
        userId
    } = req.body;
    const { session } = req as any;

    try {
        if (!guestName || !guestPhone || !roomId || !checkInDate || !checkOutDate) {
            throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc");
        }

        const booking = await createBooking({
            guestName: guestName.trim(),
            guestPhone: guestPhone.trim(),
            guestEmail: guestEmail?.trim() || null,
            guestCount: parseInt(guestCount) || 1,
            roomId: parseInt(roomId),
            checkInDate: new Date(checkInDate),
            checkOutDate: new Date(checkOutDate),
            specialRequest: specialRequest?.trim() || null,
            userId: parseInt(userId) || 1
        });

        session.messages = [
            `✅ Tạo booking thành công! Khách: ${guestName}, Tổng: ${booking.totalPrice.toLocaleString('vi-VN')}đ`
        ];
        session.save();

        return res.redirect("/admin/booking");
    } catch (error: any) {
        const rooms = await getAvailableRooms();
        session.messages = [`❌ ${error.message}`];
        session.save();

        return res.render("admin/booking/create.ejs", {
            rooms,
            error: error.message,
            oldData: req.body
        });
    }
};

const getViewBookingPage = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const booking = await getBookingById(parseInt(id));

        if (!booking) {
            return res.status(404).render("status/404.ejs", {
                message: "Booking không tồn tại"
            });
        }

        const rooms = await getAvailableRooms();

        return res.render("admin/booking/detail.ejs", {
            booking,
            rooms,
            error: undefined
        });
    } catch (error: any) {
        console.error("Error:", error);
        return res.status(400).render("status/error.ejs", {
            message: error.message
        });
    }
};

const postUpdateBooking = async (req: Request, res: Response) => {
    const {
        id,
        guestName,
        guestPhone,
        guestEmail,
        guestCount,
        roomId,
        checkInDate,
        checkOutDate,
        specialRequest,
        status
    } = req.body;
    const { session } = req as any;

    try {
        await updateBooking(parseInt(id), {
            guestName: guestName?.trim(),
            guestPhone: guestPhone?.trim(),
            guestEmail: guestEmail?.trim() || null,
            guestCount: guestCount ? parseInt(guestCount) : undefined,
            roomId: roomId ? parseInt(roomId) : undefined,
            checkInDate: checkInDate ? new Date(checkInDate) : undefined,
            checkOutDate: checkOutDate ? new Date(checkOutDate) : undefined,
            specialRequest: specialRequest?.trim() || null,
            status: status as any
        });

        session.messages = [`✅ Cập nhật booking thành công!`];
        session.save();

        return res.redirect("/admin/booking");
    } catch (error: any) {
        const booking = await getBookingById(parseInt(id));
        const rooms = await getAvailableRooms();

        session.messages = [`❌ ${error.message}`];
        session.save();

        return res.render("admin/booking/detail.ejs", {
            booking,
            rooms,
            error: error.message
        });
    }
};

const postDeleteBooking = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { session } = req as any;

    try {
        await deleteBooking(parseInt(id));

        session.messages = [`✅ Xóa booking #${id} thành công!`];
        session.save();

        return res.redirect("/admin/booking");
    } catch (error: any) {
        session.messages = [`❌ ${error.message}`];
        session.save();

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