// ==================== src/routes/web.ts (Đã sửa) ====================
import express, { Express } from "express";
import passport from "passport";
import fileUploadMiddleware from "../middleware/multer";

// ... (Các import khác giữ nguyên)
import { isLogin, isAuthenticated, isAdmin } from "../middleware/auth";
import { getAdminBookingPage, getCreateBookingPage, getViewBookingPage, postCreateBooking, postDeleteBooking, postUpdateBooking } from "controllers/admin/booking.controller";
import { getAdminPaymentPage, getAdminRoomPage, getAdminUserPage, getDashboardPage } from "controllers/admin/dashboard.controller";
// import { getViewPaymentPage, postCancelPayment, postConfirmPayment, postCreatePayment } from "controllers/admin/payment.controller";
import { getRoomsPage } from "controllers/client/room.controller";
import { getTeamPage } from "controllers/team.controller";
import { getServicePage } from "controllers/service.controller";
import { getLoginPage, getRegisterPage, getSuccessRedirectPage, postLogout, postRegister } from "controllers/client/auth.controller";
import { getBookingPage, getBookingSuccess, postAvailableRooms, postBookingSubmit } from "controllers/client/booking.controller";
import { getCreateUserPage, getViewUser, postCreateUser, postDeleteUser, postUpdateUser } from "controllers/user.controller";
import { getCreateRoomPage, getViewRoom, postCreateRoom, postDeleteRoom, postUpdateRoom } from "controllers/admin/room.controller";
import { cancelMyBooking, getMyBookingsPage, getProfilePage, updateProfile } from "controllers/client/profile.controller";
// ... (Các import khác giữ nguyên)

const router = express.Router();

const webRoutes = (app: Express) => {

    // ==================== PUBLIC ROUTES ====================
    router.get("/", (req, res) => {
        res.render("client/home/show");
    });
    router.get("/rooms", getRoomsPage);
    router.get("/team", getTeamPage);
    router.get("/service", getServicePage);


    // ==================== AUTH ROUTES ====================
    router.get("/login", isLogin, getLoginPage);
    router.post("/login", passport.authenticate("local", {
        successRedirect: "/success-redirect",
        failureRedirect: "/login",
        failureMessage: true
    }));

    router.get("/register",  getRegisterPage);
    router.post("/register",  postRegister);
    router.get("/success-redirect", isAuthenticated, getSuccessRedirectPage);
    router.post("/logout", isAuthenticated, postLogout);

    // ==================== CLIENT BOOKING ROUTES (Đã sửa) ====================
    // SỬA: Chỉ giữ lại MỘT route /booking và yêu cầu đăng nhập
    router.get("/booking", isAuthenticated, getBookingPage);
    router.post("/booking/available-rooms", isAuthenticated, postAvailableRooms); // Thêm isAuthenticated
    router.post("/booking/submit", isAuthenticated, postBookingSubmit);       // Thêm isAuthenticated
    router.get("/booking/success", isAuthenticated, getBookingSuccess);      // Thêm isAuthenticated


    // Profile Page
    router.get("/profile", isAuthenticated, getProfilePage);
    // Route xử lý cập nhật profile (POST) - Thêm dòng này
    router.post("/profile", isAuthenticated, fileUploadMiddleware("avatar", "images/avatar"), updateProfile); // Dùng multer cho avatar

    // Booking History Page
    router.get("/my-bookings", isAuthenticated, getMyBookingsPage);
    router.post("/my-bookings/:id/cancel", isAuthenticated, cancelMyBooking);


    // ==================== ADMIN ROUTES - CHỈ ADMIN ====================
    router.get("/admin", isAuthenticated, isAdmin, getDashboardPage);

    // ===== USER MANAGEMENT =====
    // Gợi ý: Các controller này nên được chuyển vào thư mục admin
    router.get("/admin/user", isAuthenticated, isAdmin, getAdminUserPage);
    router.get("/admin/create-user", isAuthenticated, isAdmin, getCreateUserPage);
    router.post("/admin/handle-create-user", isAuthenticated, isAdmin, fileUploadMiddleware("avatar", "images/avatar"), postCreateUser); // Thêm subfolder cho avatar
    router.get("/admin/view-user/:id", isAuthenticated, isAdmin, getViewUser);
    router.post("/admin/update-user", isAuthenticated, isAdmin, fileUploadMiddleware("avatar", "images/avatar"), postUpdateUser);
    router.post("/admin/delete-user/:id", isAuthenticated, isAdmin, postDeleteUser);

    // ===== ROOM MANAGEMENT =====
    router.get("/admin/room", isAuthenticated, isAdmin, getAdminRoomPage);
    router.get("/admin/create-room", isAuthenticated, isAdmin, getCreateRoomPage );
    router.post("/admin/handle-create-room", isAuthenticated, isAdmin, fileUploadMiddleware("image", "images/product"), postCreateRoom);
    router.get("/admin/view-room/:id", isAuthenticated, isAdmin, getViewRoom);
    router.post("/admin/update-room", isAuthenticated, isAdmin, fileUploadMiddleware("image", "images/product"), postUpdateRoom);
    router.post("/admin/delete-room/:id", isAuthenticated, isAdmin, postDeleteRoom);

    // ===== BOOKING MANAGEMENT (SỬA: Thêm isAuthenticated cho nhất quán) =====
   router.get("/admin/booking", isAuthenticated, isAdmin, getAdminBookingPage);
    router.get("/admin/booking/create", isAuthenticated, isAdmin, getCreateBookingPage);
    router.post("/admin/booking/handle-create", isAuthenticated, isAdmin, postCreateBooking);
    router.get("/admin/booking/detail/:id", isAuthenticated, isAdmin, getViewBookingPage);
    router.post("/admin/booking/update", isAuthenticated, isAdmin, postUpdateBooking);
    router.post("/admin/booking/delete/:id", isAuthenticated, isAdmin, postDeleteBooking);

    // // ===== PAYMENT MANAGEMENT =====
    // router.get("/admin/payment", isAuthenticated, isAdmin, getAdminPaymentPage);
    // router.post("/admin/handle-create-payment", isAuthenticated, isAdmin, postCreatePayment);
    // router.get("/admin/view-payment/:id", isAuthenticated, isAdmin, getViewPaymentPage);
    // router.post("/admin/confirm-payment/:id", isAuthenticated, isAdmin, postConfirmPayment);
    // router.post("/admin/cancel-payment/:id", isAuthenticated, isAdmin, postCancelPayment);

    // Áp dụng router vào app
    app.use("/", router);
};

export default webRoutes;