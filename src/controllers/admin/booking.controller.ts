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
        const bookings = await getAllBookings();
        const { session } = req as any;
        const messages = session?.messages ?? [];
        
        // Clear messages after rendering
        if (session?.messages) {
            session.messages = [];
            session.save();
        }
        
        return res.render("admin/booking/show.ejs", { bookings, messages });
    } catch (error: any) {
        console.error("Error fetching bookings:", error);
        return res.render("admin/booking/show.ejs", { bookings: [], messages: [], error: error.message });
    }
}

const getCreateBookingPage = async (req: Request, res: Response) => {
    try {
        const rooms = await getAvailableRooms();
        return res.render("admin/booking/create.ejs", { rooms });
    } catch (error: any) {
        return res.render("admin/booking/create.ejs", { rooms: [], error: error.message });
    }
}

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
        const booking = await createBooking({
            guestName,
            guestPhone,
            guestEmail: guestEmail || null,
            guestCount: parseInt(guestCount) || 1,
            roomId: parseInt(roomId),
            checkInDate: new Date(checkInDate),
            checkOutDate: new Date(checkOutDate),
            specialRequest: specialRequest || null,
            userId: parseInt(userId) || 1
        });

        // ✅ Add success message
        session.messages = [
            `✅ Booking created successfully! Room: ${booking.roomBookings[0]?.room?.name}, Total: ${booking.totalPrice.toLocaleString()} VND`
        ];
        session.save();

        return res.redirect("/admin/booking");
    } catch (error: any) {
        const rooms = await getAvailableRooms();
        
        // ✅ Add error message
        session.messages = [`❌ ${error.message}`];
        session.save();
        
        return res.render("admin/booking/create.ejs", {
            rooms,
            error: error.message,
            oldData: req.body
        });
    }
}

const getViewBookingPage = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const booking = await getBookingById(parseInt(id));
        if (!booking) {
            return res.status(404).render("status/404.ejs");
        }

        const rooms = await getAvailableRooms();
        return res.render("admin/booking/detail.ejs", { booking, rooms });
    } catch (error: any) {
        return res.status(400).send(error.message);
    }
}

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
            guestName,
            guestPhone,
            guestEmail: guestEmail || null,
            guestCount: parseInt(guestCount),
            roomId: parseInt(roomId),
            checkInDate: new Date(checkInDate),
            checkOutDate: new Date(checkOutDate),
            specialRequest: specialRequest || null,
            status
        });

        // ✅ Add success message
        session.messages = [`✅ Booking updated successfully!`];
        session.save();

        return res.redirect("/admin/booking");
    } catch (error: any) {
        const booking = await getBookingById(parseInt(id));
        const rooms = await getAvailableRooms();
        
        // ✅ Add error message
        session.messages = [`❌ ${error.message}`];
        session.save();
        
        return res.render("admin/booking/detail.ejs", {
            booking,
            rooms,
            error: error.message
        });
    }
}

const postDeleteBooking = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { session } = req as any;

    try {
        const booking = await getBookingById(parseInt(id));
        await deleteBooking(parseInt(id));
        
        // ✅ Add success message
        session.messages = [`✅ Booking #${id} deleted successfully!`];
        session.save();
        
        return res.redirect("/admin/booking");
    } catch (error: any) {
        // ✅ Add error message
        session.messages = [` ${error.message}`];
        session.save();
        
        return res.redirect("/admin/booking");
    }
}

export {
    getAdminBookingPage,
    getCreateBookingPage,
    postCreateBooking,
    getViewBookingPage,
    postUpdateBooking,
    postDeleteBooking
}