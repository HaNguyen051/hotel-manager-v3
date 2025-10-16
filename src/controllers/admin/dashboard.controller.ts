import { Request, Response } from "express";
import { getDashboardInfo } from "services/admin/dashboard.service";
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

const getAdminBookingPage = async (req: Request, res: Response) => {

    return res.render("admin/booking/show.ejs");
}
const getAdminPaymentPage = async (req: Request, res: Response) => {

    return res.render("admin/payment/show.ejs");
}

export {
    getDashboardPage, getAdminUserPage, getAdminRoomPage,
    getAdminBookingPage , getAdminPaymentPage
}