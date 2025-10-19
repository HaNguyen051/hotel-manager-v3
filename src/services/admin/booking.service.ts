// ==================== src/services/admin/booking.service.ts (REVISED LOGIC) ====================
import { prisma } from "config/client";
import { BookingStatus, RoomStatus, PaymentStatus, Prisma } from "@prisma/client"; // Import Enums

// --- Interfaces ---
interface CreateBookingData {
    guestName: string;
    guestPhone: string;
    guestEmail?: string | null;
    guestCount: number;
    roomId: number;
    checkInDate: Date;
    checkOutDate: Date;
    specialRequest?: string | null;
    userId: number; // Assuming Admin creates booking 'on behalf of' a user or a default admin user
}

interface UpdateBookingData {
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string | null;
    guestCount?: number;
    roomId?: number; // Allow changing room
    checkInDate?: Date;
    checkOutDate?: Date;
    specialRequest?: string | null;
    status?: BookingStatus;
}

// ========== HELPERS (Revised isRoomAvailable) ==========
const calculateNights = (checkIn: Date, checkOut: Date): number => {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffTime = Math.max(checkOut.getTime() - checkIn.getTime(), 0);
    const nights = Math.ceil(diffTime / msPerDay);
    return nights === 0 && diffTime > 0 ? 1 : nights; // Ensure at least 1 night if checkout > checkin
};

const validateDates = (checkIn: Date, checkOut: Date, allowPast = false) => { // Allow past for admin view?
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkInDay = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());

    if (!allowPast && checkInDay < today) {
        throw new Error("Ngày nhận phòng không thể là ngày trong quá khứ.");
    }
    if (checkOut <= checkIn) {
        throw new Error("Ngày trả phòng phải sau ngày nhận phòng.");
    }
    const nights = calculateNights(checkIn, checkOut);
    if (nights <= 0) throw new Error("Số đêm phải lớn hơn 0.");
    if (nights > 365) throw new Error("Booking không thể vượt quá 365 đêm.");
};

// REVISED: Query directly on Booking for conflicts
const isRoomAvailable = async (
    roomId: number,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: number // For checking availability when updating
): Promise<boolean> => {
    try {
        const conflictBooking = await prisma.booking.findFirst({
            where: {
                roomId,
                status: {
                    in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] // Check against confirmed/checked-in
                },
                checkOutDate: { gt: checkIn }, // Existing booking ends after my start
                checkInDate: { lt: checkOut }, // Existing booking starts before my end
                // Exclude the booking being updated
                ...(excludeBookingId && { id: { not: excludeBookingId } })
            }
        });
        return !conflictBooking; // Available if no conflict found
    } catch (error) {
        console.error("[Service] Error checking availability:", error);
        throw new Error("Lỗi khi kiểm tra tình trạng phòng.");
    }
};

// ========== CRUD OPERATIONS (Revised) ==========

const getAllBookings = async (statusFilter?: string) => {
    try {
        let where: Prisma.BookingWhereInput = {}; // Use correct Prisma type
        // Validate status filter
        if (statusFilter && statusFilter !== 'all' && Object.values(BookingStatus).includes(statusFilter as BookingStatus)) {
            where = { status: statusFilter as BookingStatus };
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: { // Ensure all necessary relations are included for the view
                user: { select: { id: true, fullName: true, phone: true, username: true } },
                roomBookings: { include: { room: { select: { id: true, name: true, type: true } } } }, // Include room ID here
                payment: { select: { id: true, paymentStatus: true } } // Include payment ID
            },
            orderBy: { createdAt: 'desc' }
        });
        return bookings;
    } catch (error) {
        console.error("[Service] Error fetching bookings:", error);
        throw new Error("Không thể tải danh sách đặt phòng.");
    }
};

const getBookingById = async (id: number) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: { // Include everything needed for detail view
                user: { select: { id: true, fullName: true, phone: true, username: true } },
                roomBookings: { include: { room: true } }, // Full room info for detail
                payment: true // Full payment info
            }
        });
        // No need to check for existence here, controller should handle null
        return booking;
    } catch (error) {
        console.error(`[Service] Error fetching booking ${id}:`, error);
        throw new Error("Không thể tải chi tiết đặt phòng.");
    }
};

// Get rooms suitable for Admin booking (e.g., AVAILABLE or CLEANING)
const getRoomsForAdminBooking = async () => {
    try {
        const rooms = await prisma.room.findMany({
            where: {
                status: {
                    in: [RoomStatus.AVAILABLE, RoomStatus.CLEANING] // Include cleaning rooms?
                }
            },
            select: { id: true, name: true, type: true, price: true, capacity: true },
            orderBy: { name: 'asc' }
        });
        return rooms;
    } catch (error) {
        console.error("[Service] Error fetching available rooms for admin:", error);
        throw new Error("Không thể tải danh sách phòng.");
    }
};

// REVISED: Create booking and update room status
const createBooking = async (data: CreateBookingData) => {
    return await prisma.$transaction(async (tx) => {
        // Validation
        if (!data.guestName || !data.guestPhone || !data.roomId || !data.userId) {
            throw new Error("Thiếu thông tin khách hàng, phòng hoặc người dùng.");
        }
        validateDates(data.checkInDate, data.checkOutDate);

        // Check room existence and capacity
        const room = await tx.room.findUnique({ where: { id: data.roomId } });
        if (!room) throw new Error("Phòng không tồn tại.");
        if (room.capacity < data.guestCount) throw new Error(`Phòng chỉ chứa tối đa ${room.capacity} người.`);
        if (room.status === RoomStatus.MAINTENANCE) throw new Error("Phòng đang được bảo trì.");

        // Check availability within transaction
        const isAvailable = await isRoomAvailable(data.roomId, data.checkInDate, data.checkOutDate);
        if (!isAvailable) {
            throw new Error(`Phòng ${room.name} không còn trống trong khoảng thời gian này.`);
        }

        // Calculate price
        const nights = calculateNights(data.checkInDate, data.checkOutDate);
        if (nights <= 0) throw new Error("Số đêm không hợp lệ.");
        const totalPrice = room.price * nights;

        // Create the booking record
        const newBooking = await tx.booking.create({
            data: {
                guestName: data.guestName,
                guestPhone: data.guestPhone,
                guestEmail: data.guestEmail,
                guestCount: data.guestCount,
                checkInDate: data.checkInDate,
                checkOutDate: data.checkOutDate,
                specialRequest: data.specialRequest,
                totalPrice,
                status: BookingStatus.PENDING, // Default status
                userId: data.userId,
                roomId: data.roomId, // Assuming direct relation is okay
                roomBookings: { // Create the linking record
                    create: {
                        roomId: data.roomId,
                        price: room.price,
                        quantity: nights
                    }
                }
            },
             // Include necessary relations for the return value if needed immediately
             // include: { user: true, roomBookings: { include: { room: true } } }
        });

        // **LOGIC UPDATE**: Mark room as BOOKED since a booking (even PENDING) exists
        // Note: This prevents double-booking while pending. Adjust if PENDING shouldn't block.
        if (room.status !== RoomStatus.BOOKED) { // Only update if not already booked
             await tx.room.update({
                 where: { id: data.roomId },
                 data: { status: RoomStatus.BOOKED }
             });
        }

        return newBooking; // Return the created booking ID/object
    });
};


// REVISED: Update booking with status logic and room update
const updateBooking = async (id: number, data: UpdateBookingData) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Lấy booking hiện tại
        const currentBooking = await tx.booking.findUnique({
            where: { id },
            include: { roomBookings: true }
        });
        if (!currentBooking) throw new Error("Booking không tồn tại.");

        const oldStatus = currentBooking.status;
        const newStatus = data.status;
        const oldRoomId = currentBooking.roomBookings?.[0]?.roomId;
        const newRoomId = data.roomId;
        const checkIn = data.checkInDate || currentBooking.checkInDate;
        const checkOut = data.checkOutDate || currentBooking.checkOutDate;
        let requiresAvailabilityCheck = false;
        let requiresRoomUpdate = false; // Cờ để biết có cần cập nhật trạng thái phòng hay không

        // 2. Validate Status Transition
        if (newStatus && newStatus !== oldStatus) {
            const validTransitions: Record<BookingStatus, BookingStatus[]> = {
                'PENDING': [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
                'CONFIRMED': [BookingStatus.CHECKED_IN, BookingStatus.CANCELLED],
                'CHECKED_IN': [BookingStatus.CHECKED_OUT],
                'CHECKED_OUT': [],
                'CANCELLED': []
            };
            if (!validTransitions[oldStatus]?.includes(newStatus)) { // Giữ lại includes ở đây vì nó đơn giản hơn
                throw new Error(`Không thể chuyển từ trạng thái ${oldStatus} sang ${newStatus}.`);
            }
            requiresRoomUpdate = true;
        }
        // 3. Validate Dates if changed
        if (data.checkInDate || data.checkOutDate) {
            validateDates(checkIn, checkOut, true); // Allow past dates for viewing/editing?
            requiresAvailabilityCheck = true; // Date change requires availability check
        }

        // 4. Validate Room Change if changed
        if (newRoomId && oldRoomId !== newRoomId) {
             const newRoom = await tx.room.findUnique({ where: { id: newRoomId } });
             if (!newRoom) throw new Error("Phòng mới không tồn tại.");
             if (newRoom.status === RoomStatus.MAINTENANCE) throw new Error("Phòng mới đang bảo trì.");
             // Check capacity if guestCount is also changing or known
             const guestCount = data.guestCount || currentBooking.guestCount;
             if(newRoom.capacity < guestCount) throw new Error(`Phòng mới chỉ chứa ${newRoom.capacity} người.`);

             requiresAvailabilityCheck = true; // Room change requires availability check
             requiresRoomUpdate = true; // Need to update status for both old and new room
        }

        // 5. Check Availability if dates or room changed (excluding current booking)
       const finalRoomId = newRoomId || oldRoomId;
        if (requiresAvailabilityCheck && finalRoomId) {
            const isAvailable = await isRoomAvailable(finalRoomId, checkIn, checkOut, id);
            if (!isAvailable) throw new Error(`Phòng ${finalRoomId} không còn trống cho khoảng thời gian này.`);
        }

        // 6. Prepare update data for booking
      // 6. Prepare update data for booking
        // Declare the updateData object with the correct Prisma type
        const updateData: Prisma.BookingUpdateInput = {};

        // Assign simple text/number fields if they are provided in the input 'data'
        // Use trim() for strings and allow clearing fields by providing null or empty string (handled in service/controller)
        if (data.guestName !== undefined) updateData.guestName = data.guestName.trim();
        if (data.guestPhone !== undefined) updateData.guestPhone = data.guestPhone.trim();
        if (data.guestEmail !== undefined) updateData.guestEmail = data.guestEmail?.trim() || null; // Allow clearing email
        if (data.guestCount !== undefined) updateData.guestCount = data.guestCount; // Assumes controller sends valid number
        if (data.checkInDate) updateData.checkInDate = data.checkInDate; // Assumes controller sends valid Date object
        if (data.checkOutDate) updateData.checkOutDate = data.checkOutDate; // Assumes controller sends valid Date object
        if (data.specialRequest !== undefined) updateData.specialRequest = data.specialRequest?.trim() || null; // Allow clearing
        if (newStatus) updateData.status = newStatus; // Assign validated new status

        // Update the Room relation if the room ID has changed
        if (newRoomId && newRoomId !== oldRoomId) {
            updateData.Room = {      // Target the 'Room' relation field (defined in your schema)
                connect: { id: newRoomId } // Use 'connect' to link to the existing Room by its ID
            };
        }

        // --- Recalculate totalPrice if relevant data changed ---
        let calculatedTotalPrice = currentBooking.totalPrice; // Default to current price

        // Check if dates changed OR if the room changed (and a final room ID is determined)
        const roomOrDatesChanged = (data.checkInDate || data.checkOutDate || (newRoomId && newRoomId !== oldRoomId));

        if (roomOrDatesChanged && finalRoomId) {
             // Fetch the details (especially price) of the room that will be associated with the booking
             const roomForPrice = await tx.room.findUniqueOrThrow({
                 where: { id: finalRoomId },
                 select: { price: true } // Only need the price
             });

             // Recalculate the number of nights based on the potentially updated dates
             const nights = calculateNights(checkIn, checkOut); // Uses the updated checkIn/checkOut variables

             // If nights calculation is valid (greater than 0)
             if (nights > 0) {
                  calculatedTotalPrice = roomForPrice.price * nights; // Calculate the new total price
                  updateData.totalPrice = calculatedTotalPrice; // Add the updated price to the data going to Prisma
             } else {
                 // Handle invalid night calculation (e.g., checkOut <= checkIn) - maybe set to 0 or throw error earlier
                 updateData.totalPrice = 0; // Or keep old price? Depends on desired logic.
                 console.warn(`Booking ID ${id}: Calculated nights is 0 or less based on dates. Setting total price to 0.`);
             }
        }
        // If only guest details or status changed, updateData.totalPrice remains unset,
        // so Prisma won't update the totalPrice field.

        // 7. Update Booking
        const updatedBooking = await tx.booking.update({
            where: { id },
            data: updateData,
        });

        // 8. Update RoomBooking link if room changed
        if (newRoomId && newRoomId !== oldRoomId) {
             const roomForPrice = await tx.room.findUniqueOrThrow({ where: { id: newRoomId }});
             const nights = calculateNights(checkIn, checkOut);
            await tx.roomBooking.updateMany({ // Assuming only one room per booking for now
                 where: { bookingId: id },
                 data: {
                     roomId: newRoomId,
                     price: roomForPrice.price, // Update price based on new room
                     quantity: nights > 0 ? nights : undefined // Update nights if dates changed
                 }
            });
        } else if (data.checkInDate || data.checkOutDate) {
             // If only dates changed, update quantity in RoomBooking
             const nights = calculateNights(checkIn, checkOut);
             if (nights > 0 && oldRoomId) { // Check oldRoomId exists
                await tx.roomBooking.updateMany({
                     where: { bookingId: id, roomId: oldRoomId },
                     data: { quantity: nights }
                });
             }
        }


        // 9. Update Room Statuses
      // 9. Update Room Statuses
        if (requiresRoomUpdate) {
             const finalStatus = newStatus || oldStatus; // Final status of the booking

             // --- Handle Old Room ---
             // Check if the room changed OR if the final status means the room should be freed
             if (oldRoomId && (newRoomId !== oldRoomId ||
                 // === CORRECTED CHECK 1 ===
                 (finalStatus === BookingStatus.CANCELLED || finalStatus === BookingStatus.CHECKED_OUT))
                 // === END CORRECTION 1 ===
                )
             {
                  // Check if the OLD room has any OTHER Confirmed/CheckedIn bookings
                  const otherBookingsOldRoom = await tx.booking.findFirst({
                       where: {
                            roomId: oldRoomId,
                            id: { not: id },
                            status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] }
                       }
                  });
                  // If no other active bookings, set old room to AVAILABLE
                  if (!otherBookingsOldRoom) {
                       await tx.room.update({
                            where: { id: oldRoomId },
                            data: { status: RoomStatus.AVAILABLE }
                       });
                       console.log(`[Service Update] Set old room ${oldRoomId} to AVAILABLE.`);
                  } else {
                       console.log(`[Service Update] Old room ${oldRoomId} still has other bookings.`);
                  }
             }

             // --- Handle New/Current Room ---
             const currentRoomIdForStatus = newRoomId || oldRoomId;
             if (currentRoomIdForStatus) {
                  // === CORRECTED CHECK 2 ===
                  // If the final status is Confirmed or Checked In, mark the room as BOOKED
                  if (finalStatus === BookingStatus.CONFIRMED || finalStatus === BookingStatus.CHECKED_IN)
                  // === END CORRECTION 2 ===
                  {
                       await tx.room.update({
                            where: { id: currentRoomIdForStatus },
                            data: { status: RoomStatus.BOOKED }
                       });
                       console.log(`[Service Update] Set current/new room ${currentRoomIdForStatus} to BOOKED.`);
                  }
                  // If status changed BACK to PENDING from something else, keep it BOOKED (prevents double booking)
                  else if (finalStatus === BookingStatus.PENDING && oldStatus !== BookingStatus.PENDING) {
                       await tx.room.update({
                            where: { id: currentRoomIdForStatus },
                            data: { status: RoomStatus.BOOKED } // Keep BOOKED for PENDING
                       });
                        console.log(`[Service Update] Kept current/new room ${currentRoomIdForStatus} as BOOKED (status changed to PENDING).`);
                  }
                  // Note: If the final status is CANCELLED or CHECKED_OUT, the logic for the "Old Room"
                  // (which might be the same as the current room if the room wasn't changed)
                  // already handles setting it back to AVAILABLE if no other bookings exist.
             }
        } // End if (requiresRoomUpdate)

        return updatedBooking; // Return the updated booking object
    }); // End Transaction
}; // End updateBooking function

// ... (rest of the service file: deleteBooking, exports) ...


// REVISED: Delete booking and update room status
const deleteBooking = async (id: number) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Find booking to check status and get room ID
        const booking = await tx.booking.findUnique({
            where: { id },
            select: { status: true, roomBookings: { select: { roomId: true }} } // Select necessary fields
        });

        if (!booking) {
            throw new Error("Booking không tồn tại.");
        }

        // 2. Allow deletion only for PENDING or CANCELLED (CORRECTED CHECK)
        if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CANCELLED) {
             throw new Error(
                 `Không thể xóa booking ở trạng thái ${booking.status}. Chỉ xóa được khi PENDING hoặc CANCELLED.`
             );
        }
        // --- End Correction ---

        const roomId = booking.roomBookings?.[0]?.roomId;

        // 3. Delete related records first
        await tx.payment.deleteMany({ where: { bookingId: id } });
        await tx.roomBooking.deleteMany({ where: { bookingId: id } });
        await tx.bookingService.deleteMany({ where: { bookingId: id } }); // If using BookingService

        // 4. Delete the booking itself
        await tx.booking.delete({ where: { id } });

        // 5. Update room status if a room was associated and no other bookings hold it
        if (roomId) {
            const otherBookings = await tx.booking.findFirst({
                where: {
                    roomId: roomId,
                    // id: { not: id }, // Not needed since current booking is deleted
                    status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.PENDING] } // Check active/pending bookings
                }
            });
            // If no other relevant bookings exist for this room, set it to AVAILABLE
            if (!otherBookings) {
                await tx.room.update({
                    where: { id: roomId },
                    data: { status: RoomStatus.AVAILABLE }
                });
                 console.log(`[Service] Room ${roomId} status set to AVAILABLE after deleting booking ${id}.`);
            } else {
                 console.log(`[Service] Room ${roomId} still has other bookings, status not changed after deleting booking ${id}.`);
            }
        }

        return true; // Indicate successful deletion
    });
};


export {
    getAllBookings,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking,
    getRoomsForAdminBooking as getAvailableRooms, // Export renamed function
    calculateNights,
    validateDates
};