// ==================== src/controllers/admin/dashboard.controller.ts ====================
import { Request, Response } from "express";
import { getDashboardInfo } from "../../services/admin/dashboard.service";
import { getAllRooms } from "../../services/admin/room.service";
import { getAllUsers } from "../../services/user.service";

/**
 * GET /admin
 * Dashboard tổng quan với thống kê và biểu đồ
 */
const getDashboardPage = async (req: Request, res: Response) => {
    try {
        console.log("[Dashboard Controller] Loading dashboard...");

        // 1. Lấy số liệu thống kê từ Service
        const info = await getDashboardInfo();

        console.log("[Dashboard Controller] Dashboard info:", {
            users: info.countUser,
            rooms: info.countRoom,
            bookings: info.countBooking,
            revenue: info.totalRevenue
        });

        // 2. Render view với dữ liệu
        return res.render("admin/dashboard/show", {
            info,
            user: req.user // Truyền user cho header
        });

    } catch (error: any) {
        console.error("[Dashboard Controller] ❌ Error getting dashboard:", error.message);
        console.error("Stack:", error.stack);
        
        // Render dashboard với dữ liệu rỗng
        return res.render("admin/dashboard/show", {
            info: {
                countUser: 0,
                countRoom: 0,
                countBooking: 0,
                totalRevenue: 0,
                bookingStatusData: {},
                recentBookings: []
            },
            user: req.user,
            error: "Không thể tải dữ liệu thống kê."
        });
    }
};

/**
 * GET /admin/user
 * Trang danh sách User
 */
const getAdminUserPage = async (req: Request, res: Response) => {
    try {
        console.log("[Dashboard Controller] Loading users page...");
        
        const users = await getAllUsers();
        
        console.log(`[Dashboard Controller] Loaded ${users.length} users`);
        
        return res.render("admin/user/show", {
            users,
            user: req.user
        });
    } catch (error: any) {
        console.error("[Dashboard Controller] ❌ Error getting users:", error.message);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * GET /admin/room
 * Trang danh sách Room
 */
const getAdminRoomPage = async (req: Request, res: Response) => {
    try {
        console.log("[Dashboard Controller] Loading rooms page...");
        
        const rooms = await getAllRooms();
        
        console.log(`[Dashboard Controller] Loaded ${rooms.length} rooms`);
        
        return res.render("admin/room/show", {
            rooms,
            user: req.user
        });
    } catch (error: any) {
        console.error("[Dashboard Controller] ❌ Error getting rooms:", error.message);
        return res.status(500).send("Internal Server Error");
    }
};

export {
    getDashboardPage,
    getAdminUserPage,
    getAdminRoomPage
};