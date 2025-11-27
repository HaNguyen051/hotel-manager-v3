// ==================== src/controllers/client/room.controller.ts ====================
import { Request, Response } from "express";

import { getRoomById, getRoomsList } from "services/client/room.service"; // Import service vừa tạo

const getRoomsPage = async (req: Request, res: Response) => {
    try {
        // Lấy các tham số từ URL (ví dụ: ?page=1&type=Single)
        const query = req.query;

        // Gọi service để lấy dữ liệu
        const data = await getRoomsList(query);

        // Render view
        return res.render("client/room/show.ejs", {
            user: req.user, // Truyền user cho header
            rooms: data.rooms,
            pagination: data.pagination,
            searchParams: query // Truyền lại tham số tìm kiếm để giữ trạng thái form
        });
    } catch (error) {
        console.error("Error getting rooms page:", error);
        // Render trang lỗi hoặc trang trống
        return res.render("client/room/show.ejs", {
            user: req.user,
            rooms: [],
            pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 8 },
            searchParams: {},
            error: "Có lỗi xảy ra khi tải danh sách phòng."
        });
    }
};
export const getRoomDetailPage = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const roomId = parseInt(id);
        if (isNaN(roomId)) {
            return res.redirect('/rooms');
        }

        const room = await getRoomById(roomId);

        if (!room) {
            // Nếu không tìm thấy phòng, quay về danh sách
            return res.redirect('/rooms');
        }

        return res.render("client/room/detail.ejs", {
            user: req.user,
            room: room
        });
    } catch (error) {
        console.error("Error getting room detail page:", error);
        return res.redirect('/rooms');
    }
};
export {
    getRoomsPage
};