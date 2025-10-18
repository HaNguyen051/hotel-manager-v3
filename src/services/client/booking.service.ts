import { prisma } from "config/client";

export const getUserBookings = async (userId: number, status?: string) => {
    const where: any = { userId };
    
    if (status) {
        where.status = status;
    }

    return await prisma.booking.findMany({
        where,
        include: {
            roomBookings: {
                include: {
                    room: true
                }
            },
            bookingServices: {
                include: {
                    service: true
                }
            },
            payment: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
};

export const cancelUserBooking = async (bookingId: number) => {
    return await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
    });
};