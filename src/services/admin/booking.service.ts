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
}

// ========== HELPERS ==========
const calculateNights = (checkIn: Date, checkOut: Date): number => {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / msPerDay);
};

const validateDates = (checkIn: Date, checkOut: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (checkIn < now) {
        throw new Error("Ngày nhận phòng không thể là ngày quá khứ");
    }

    if (checkOut <= checkIn) {
        throw new Error("Ngày trả phòng phải sau ngày nhận phòng");
    }

    const nights = calculateNights(checkIn, checkOut);
    if (nights > 365) {
        throw new Error("Booking không thể vượt quá 365 đêm");
    }
};

const isRoomAvailable = async (
    roomId: number,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: number
) => {
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
        console.error("Error checking availability:", error);
        throw error;
    }
};

// ========== CRUD OPERATIONS ==========

const getAllBookings = async (status?: string) => {
    try {
        const where = status && status !== 'all' ? { status: status as BookingStatus } : {};

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        username: true
                    }
                },
                roomBookings: {
                    include: { room: true }
                },
                payment: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return bookings;
    } catch (error) {
        console.error("Error fetching bookings:", error);
        throw error;
    }
};

const getBookingById = async (id: number) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        username: true
                    }
                },
                roomBookings: {
                    include: { room: true }
                },
                payment: true
            }
        });

        return booking;
    } catch (error) {
        console.error("Error fetching booking:", error);
        throw error;
    }
};

const getAvailableRooms = async () => {
    try {
        const rooms = await prisma.room.findMany({
            where: { status: 'AVAILABLE' },
            select: {
                id: true,
                name: true,
                type: true,
                price: true,
                capacity: true,
                description: true
            },
            orderBy: { name: 'asc' }
        });

        return rooms;
    } catch (error) {
        console.error("Error fetching available rooms:", error);
        throw error;
    }
};

const createBooking = async (data: CreateBookingData) => {
    try {
        if (!data.guestName || !data.guestPhone || !data.roomId) {
            throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc");
        }

        validateDates(data.checkInDate, data.checkOutDate);

        const isAvailable = await isRoomAvailable(
            data.roomId,
            data.checkInDate,
            data.checkOutDate
        );

        if (!isAvailable) {
            throw new Error("Phòng không khả dụng cho khoảng thời gian này");
        }

        const room = await prisma.room.findUnique({
            where: { id: data.roomId }
        });

        if (!room) {
            throw new Error("Phòng không tồn tại");
        }

        const nights = calculateNights(data.checkInDate, data.checkOutDate);
        const totalPrice = room.price * nights;

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
                status: 'PENDING',
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
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        username: true
                    }
                },
                roomBookings: {
                    include: { room: true }
                },
                payment: true
            }
        });

        return booking;
    } catch (error) {
        console.error("Error creating booking:", error);
        throw error;
    }
};

const updateBooking = async (id: number, data: UpdateBookingData) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: { roomBookings: true }
        });

        if (!booking) {
            throw new Error("Booking không tồn tại");
        }

        // Validate status transition
        if (data.status) {
            const validTransitions: Record<BookingStatus, BookingStatus[]> = {
                'PENDING': ['CONFIRMED', 'CANCELLED'],
                'CONFIRMED': ['CHECKED_IN', 'CANCELLED'],
                'CHECKED_IN': ['CHECKED_OUT'],
                'CHECKED_OUT': [],
                'CANCELLED': []
            };

            if (!validTransitions[booking.status].includes(data.status)) {
                throw new Error(
                    `Không thể chuyển từ ${booking.status} sang ${data.status}`
                );
            }
        }

        if (data.checkInDate || data.checkOutDate) {
            const checkIn = data.checkInDate || booking.checkInDate;
            const checkOut = data.checkOutDate || booking.checkOutDate;

            validateDates(checkIn, checkOut);

            const roomId = data.roomId || booking.roomId;
            if (roomId) {
                const isAvailable = await isRoomAvailable(roomId, checkIn, checkOut, id);

                if (!isAvailable) {
                    throw new Error("Phòng không khả dụng cho khoảng thời gian này");
                }
            }
        }

        const updateData: any = {};
        if (data.guestName !== undefined) updateData.guestName = data.guestName;
        if (data.guestPhone !== undefined) updateData.guestPhone = data.guestPhone;
        if (data.guestEmail !== undefined) updateData.guestEmail = data.guestEmail;
        if (data.guestCount !== undefined) updateData.guestCount = data.guestCount;
        if (data.checkInDate) updateData.checkInDate = data.checkInDate;
        if (data.checkOutDate) updateData.checkOutDate = data.checkOutDate;
        if (data.specialRequest !== undefined) updateData.specialRequest = data.specialRequest;
        if (data.status) updateData.status = data.status;

        const updated = await prisma.booking.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        username: true
                    }
                },
                roomBookings: {
                    include: { room: true }
                },
                payment: true
            }
        });

        return updated;
    } catch (error) {
        console.error("Error updating booking:", error);
        throw error;
    }
};

const deleteBooking = async (id: number) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id }
        });

        if (!booking) {
            throw new Error("Booking không tồn tại");
        }

        if (!['PENDING', 'CANCELLED'].includes(booking.status)) {
            throw new Error(
                `Không thể xóa booking ở trạng thái ${booking.status}`
            );
        }

        await prisma.roomBooking.deleteMany({
            where: { bookingId: id }
        });

        await prisma.booking.delete({
            where: { id }
        });
    } catch (error) {
        console.error("Error deleting booking:", error);
        throw error;
    }
};

export {
    getAllBookings,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking,
    getAvailableRooms,
    calculateNights,
    validateDates
};