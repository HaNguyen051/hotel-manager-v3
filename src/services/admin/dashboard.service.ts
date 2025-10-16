import { prisma } from "config/client"

const getDashboardInfo = async () => {
    const countUser = await prisma.user.count();
    const countRoom = await prisma.room.count();
    const countBooking = await prisma.booking.count();

    return {
        countUser, countRoom, countBooking
    }

}

export {
    getDashboardInfo
}