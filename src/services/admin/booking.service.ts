import { prisma } from "config/client";
import { BookingStatus } from "@prisma/client";

interface CreateBookingData {
    guestName: string;
    guestPhone: string;
    guestEmail?: string | null;
    guestCount: number;
    roomId: number;
    checkInDate: Date;
    checkOutDate: Date;
    specialRequest?: string | null;
    userId: number;
}

interface UpdateBookingData {
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string | null;
    guestCount?: number;
    roomId?: number;
    checkInDate?: Date;
    checkOutDate?: Date;
    specialRequest?: string | null;
    status?: BookingStatus;
    totalPrice?: number; // ✅ Thêm dòng này
}

// ✅ Helper: Calculate number of nights
const calculateNights = (checkIn: Date, checkOut: Date): number => {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / msPerDay);
}

// ✅ Helper: Validate booking dates
const validateDates = (checkIn: Date, checkOut: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (checkIn < now) {
        throw new Error("Check-in date không thể là ngày quá khứ");
    }

    if (checkOut <= checkIn) {
        throw new Error("Check-out date phải sau check-in date");
    }

    const maxDays = 365;
    const nights = calculateNights(checkIn, checkOut);
    if (nights > maxDays) {
        throw new Error(`Booking không thể vượt quá ${maxDays} đêm`);
    }
}

// ✅ Helper: Check room availability
const isRoomAvailable = async (roomId: number, checkIn: Date, checkOut: Date, excludeBookingId?: number) => {
    try {
        const conflictBooking = await prisma.roomBooking.findFirst({
            where: {
                roomId,
                booking: {
                    status: {
                        in: ['CONFIRMED', 'CHECKED_IN'] as any
                    },
                    checkInDate: { lt: new Date(checkOut) },
                    checkOutDate: { gt: new Date(checkIn) },
                    ...(excludeBookingId && { id: { not: excludeBookingId } })
                }
            }
        });

        return !conflictBooking;
    } catch (error) {
        console.error("Error checking room availability:", error);
        return false;
    }
}

const getAllBookings = async () => {
    const bookings = await prisma.booking.findMany({
        include: {
            user: true,
            roomBookings: {
                include: { room: true }
            },
            payment: true
        },
        orderBy: { createdAt: 'desc' }
    });

    return bookings;
}

const getBookingById = async (id: number) => {
    const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
            user: true,
            roomBookings: {
                include: { room: true }
            },
            payment: true
        }
    });

    return booking;
}

const getAvailableRooms = async () => {
    const rooms = await prisma.room.findMany({
        where: { status: 'AVAILABLE' },
        orderBy: { name: 'asc' }
    });

    return rooms;
}

const createBooking = async (data: CreateBookingData) => {
    validateDates(data.checkInDate, data.checkOutDate);

    // Check room availability
    const isAvailable = await isRoomAvailable(data.roomId, data.checkInDate, data.checkOutDate);
    if (!isAvailable) {
        throw new Error("Phòng này không khả dụng cho khoảng thời gian này");
    }

    // Get room to calculate price
    const room = await prisma.room.findUnique({
        where: { id: data.roomId }
    });

    if (!room) {
        throw new Error("Phòng không tồn tại");
    }

    // Calculate nights and total price
    const nights = calculateNights(data.checkInDate, data.checkOutDate);
    const totalPrice = room.price * nights;

    // Create booking with room booking
    const booking = await prisma.booking.create({
        data: {
            guestName: data.guestName,
            guestPhone: data.guestPhone,
            guestEmail: data.guestEmail || null,
            guestCount: data.guestCount,
            checkInDate: data.checkInDate,
            checkOutDate: data.checkOutDate,
            specialRequest: data.specialRequest || null,
            totalPrice,
            status: 'CONFIRMED', // ✅ Set CONFIRMED thay vì PENDING để auto update room status
            userId: data.userId,
            roomId: data.roomId,
            roomBookings: {
                create: {
                    roomId: data.roomId,
                    price: room.price,
                    quantity: nights
                }
            }
        },
        include: {
            roomBookings: { include: { room: true } },
            user: true
        }
    });

    // ✅ Update room status to BOOKED
    await prisma.room.update({
        where: { id: data.roomId },
        data: { status: 'BOOKED' }
    });

    return booking;
}

const updateBooking = async (id: number, data: UpdateBookingData) => {
    const booking = await prisma.booking.findUnique({
        where: { id },
        include: { roomBookings: true }
    });

    if (!booking) {
        throw new Error("Booking không tồn tại");
    }

    // If dates changed, validate and check availability
    if (data.checkInDate || data.checkOutDate) {
        const checkIn = data.checkInDate || booking.checkInDate;
        const checkOut = data.checkOutDate || booking.checkOutDate;
        
        validateDates(checkIn, checkOut);

        const roomId = data.roomId || booking.roomId;
        const isAvailable = await isRoomAvailable(roomId, checkIn, checkOut, id);
        
        if (!isAvailable) {
            throw new Error("Phòng không khả dụng cho khoảng thời gian này");
        }

        // Recalculate total price
        if (data.roomId) {
            const newRoom = await prisma.room.findUnique({
                where: { id: data.roomId }
            });
            const nights = calculateNights(checkIn, checkOut);
            data.totalPrice = newRoom!.price * nights;
        }
    }

    const updateData: any = {};
    if (data.guestName) updateData.guestName = data.guestName;
    if (data.guestPhone) updateData.guestPhone = data.guestPhone;
    if (data.guestEmail !== undefined) updateData.guestEmail = data.guestEmail;
    if (data.guestCount) updateData.guestCount = data.guestCount;
    if (data.checkInDate) updateData.checkInDate = data.checkInDate;
    if (data.checkOutDate) updateData.checkOutDate = data.checkOutDate;
    if (data.specialRequest !== undefined) updateData.specialRequest = data.specialRequest;
    if (data.status) updateData.status = data.status;
    if (data.totalPrice) updateData.totalPrice = data.totalPrice; // ✅ Thêm dòng này

    const updatedBooking = await prisma.booking.update({
        where: { id },
        data: updateData,
        include: {
            roomBookings: { include: { room: true } },
            user: true
        }
    });

    return updatedBooking;
}

const deleteBooking = async (id: number) => {
    const booking = await prisma.booking.findUnique({
        where: { id }
    });

    if (!booking) {
        throw new Error("Booking không tồn tại");
    }

    // Không cho xóa booking đã confirmed
    if (['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.status)) {
        throw new Error("Không thể xóa booking đã xác nhận");
    }

    // Delete room bookings first (foreign key constraint)
    await prisma.roomBooking.deleteMany({
        where: { bookingId: id }
    });

    // Delete booking
    await prisma.booking.delete({
        where: { id }
    });
}

export {
    getAllBookings,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking,
    getAvailableRooms,
    calculateNights
}