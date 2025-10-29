import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

// 🏠 Hiển thị danh sách phòng
const getRoomsPage = async (req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany(); // lấy danh sách phòng từ DB
    res.render("client/room/show.ejs", { rooms }); // <-- truyền rooms xuống EJS
  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi khi lấy danh sách phòng");
  }
};

// 🛏️ Hiển thị chi tiết phòng
const getRoomDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id: Number(id) },
    });

    if (!room) return res.status(404).send("Không tìm thấy phòng");

    res.render("client/room/room_detail.ejs", { room });
  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi khi lấy chi tiết phòng");
  }
};

export { getRoomsPage, getRoomDetail };
