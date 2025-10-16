// ==================== src/routes/web.ts ====================
import express, { Express } from "express";
import passport from "passport";
import fileUploadMiddleware from "../middleware/multer";

// Import Admin Controllers
import {
    getDashboardPage,
    getAdminBookingPage,
    getAdminPaymentPage,
    getAdminRoomPage,
    getAdminUserPage
} from "controllers/admin/dashboard.controller";

import {
    getCreateRoomPage,
    getViewRoom,
    postCreateRoom,
    postDeleteRoom,
    postUpdateRoom
} from "controllers/admin/room.controller";

import {
    getCreateUserPage,
    getViewUser,
    postCreateUser,
    postDeleteUser,
    postUpdateUser
} from "controllers/user.controller";

// Import Auth Controllers
import {
    getLoginPage,
    getRegisterPage,
    postRegister,
    getSuccessRedirectPage,
    postLogout
} from "controllers/client/auth.controller";

// Import Middleware
import { isLogin, isAuthenticated, isAdmin } from "../middleware/auth";

const router = express.Router();

const webRoutes = (app: Express) => {

    // ==================== PUBLIC ROUTES ====================
    // Trang chủ - Ai cũng truy cập được
    router.get("/", (req, res) => {
        res.render("client/home/show");
    });

    // ==================== AUTH ROUTES ====================
    // Login & Register - Chỉ người chưa đăng nhập
    router.get("/login", isLogin, getLoginPage);
    router.post("/login", passport.authenticate("local", {
        successRedirect: "/success-redirect",
        failureRedirect: "/login",
        failureMessage: true
    }));

    router.get("/register", isLogin, getRegisterPage);
    router.post("/register", isLogin, postRegister);

    // Redirect sau khi login thành công
    router.get("/success-redirect", isAuthenticated, getSuccessRedirectPage);

    // Logout - Cần đăng nhập
    router.post("/logout", isAuthenticated, postLogout);

    // ==================== USER ROUTES (Authenticated) ====================
    // Profile - Cần đăng nhập (cả Admin và User đều vào được)
    router.get("/profile", isAuthenticated, (req, res) => {
        res.render("client/profile/index", { user: req.user });
    });

    // Các route cho user xem phòng, đặt phòng (nếu có)
    // router.get("/rooms", isAuthenticated, getRoomsPage);
    // router.get("/booking", isAuthenticated, getBookingPage);

    // ==================== ADMIN ROUTES - CHỈ ADMIN ====================
    // Dashboard
    router.get("/admin", isAuthenticated, isAdmin, getDashboardPage);

    // ===== USER MANAGEMENT =====
    router.get("/admin/user", isAuthenticated, isAdmin, getAdminUserPage);
    router.get("/admin/create-user", isAuthenticated, isAdmin, getCreateUserPage);
    router.post("/admin/handle-create-user", isAuthenticated, isAdmin, fileUploadMiddleware("avatar"), postCreateUser);
    router.get("/admin/view-user/:id", isAuthenticated, isAdmin, getViewUser);
    router.post("/admin/update-user", isAuthenticated, isAdmin, fileUploadMiddleware("avatar"), postUpdateUser);
    router.post("/admin/delete-user/:id", isAuthenticated, isAdmin, postDeleteUser);

    // ===== ROOM MANAGEMENT =====
    router.get("/admin/room", isAuthenticated, isAdmin, getAdminRoomPage);
    router.get("/admin/create-room", isAuthenticated, isAdmin, getCreateRoomPage);
    router.post("/admin/handle-create-room", isAuthenticated, isAdmin, fileUploadMiddleware("image"), postCreateRoom);
    router.get("/admin/view-room/:id", isAuthenticated, isAdmin, getViewRoom);
    router.post("/admin/update-room", isAuthenticated, isAdmin, fileUploadMiddleware("image"), postUpdateRoom);
    router.post("/admin/delete-room/:id", isAuthenticated, isAdmin, postDeleteRoom);

    // ===== BOOKING MANAGEMENT =====
    router.get("/admin/booking", isAuthenticated, isAdmin, getAdminBookingPage);

    // ===== PAYMENT MANAGEMENT =====
    router.get("/admin/payment", isAuthenticated, isAdmin, getAdminPaymentPage);

    // Apply routes to app
    app.use("/", router);
};

export default webRoutes;