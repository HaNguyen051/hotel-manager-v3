import { Request, Response } from "express";
import { getDashboardInfo } from "services/admin/dashboard.service";
import { getAllPayments } from "services/admin/payment.service";
import { getAllRooms } from "services/admin/room.service";
import { getAllUsers } from "services/user.service";

const getDashboardPage = async (req: Request, res: Response) => {
    const info = await getDashboardInfo();
    return res.render("admin/dashboard/show.ejs", {
        info
    });
}


const getAdminUserPage = async (req: Request, res: Response) => {
    const users = await getAllUsers();
    return res.render("admin/user/show.ejs", {
        users: users
    });
}

const getAdminRoomPage = async (req: Request, res: Response) => {
    const rooms = await getAllRooms();
    return res.render("admin/room/show.ejs", {
        rooms
    });
}


const getAdminPaymentPage = async (req: Request, res: Response) => {
    try {
        const payments = await getAllPayments();
        const { session } = req as any;
        const messages = session?.messages ?? [];

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
    getDashboardPage, getAdminUserPage, getAdminRoomPage,  getAdminPaymentPage
}