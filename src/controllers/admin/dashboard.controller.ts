// src/controllers/admin/dashboard.controller.ts
import { Request, Response } from "express";
import { getDashboardInfo } from "services/admin/dashboard.service";
import { getAllPayments } from "services/admin/payment.service";
import { getAllRooms } from "services/admin/room.service";
import { getAllUsers } from "services/user.service";
import { getAllBookings } from "services/admin/booking.service";

const getDashboardPage = async (req: Request, res: Response) => {
    try {
        const info = await getDashboardInfo();
        return res.render("admin/dashboard/show.ejs", {
            info
        });
    } catch (error) {
        console.error("Error getting dashboard:", error);
        return res.status(500).send("Internal Server Error");
    }
};

const getAdminUserPage = async (req: Request, res: Response) => {
    try {
        const users = await getAllUsers();
        return res.render("admin/user/show.ejs", {
            users
        });
    } catch (error) {
        console.error("Error getting users:", error);
        return res.status(500).send("Internal Server Error");
    }
};

const getAdminRoomPage = async (req: Request, res: Response) => {
    try {
        const rooms = await getAllRooms();
        return res.render("admin/room/show.ejs", {
            rooms
        });
    } catch (error) {
        console.error("Error getting rooms:", error);
        return res.status(500).send("Internal Server Error");
    }
};

const getAdminBookingPage = async (req: Request, res: Response) => {
    try {
        const bookings = await getAllBookings();
        const session = req.session as any;
        const messages = session?.messages || [];

        if (session?.messages) {
            session.messages = [];
        }

        return res.render("admin/booking/show.ejs", {
            bookings,
            filterStatus: 'all',
            messages
        });
    } catch (error) {
        console.error("Error getting bookings:", error);
        return res.status(500).send("Internal Server Error");
    }
};

const getAdminPaymentPage = async (req: Request, res: Response) => {
    try {
        const payments = await getAllPayments();
        const session = req.session as any;
        const messages = session?.messages || [];

        if (session?.messages) {
            session.messages = [];
            session.save();
        }

        return res.render("admin/payment/show.ejs", {
            payments,
            messages,
            error: undefined
        });
    } catch (error: any) {
        console.error("Error:", error);
        return res.render("admin/payment/show.ejs", {
            payments: [],
            messages: [],
            error: error.message
        });
    }
};

export {
    getDashboardPage,
    getAdminUserPage,
    getAdminRoomPage,
    getAdminBookingPage,
    getAdminPaymentPage
};