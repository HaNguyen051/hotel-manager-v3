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


export {
    getDashboardPage,
    getAdminUserPage,
    getAdminRoomPage,
};