
import { getAdminBookingPage, getAdminPaymentPage, getAdminRoomPage, getAdminUserPage, getDashboardPage } from "controllers/admin/dashboard.controller";
import { getCreateUserPage, getViewUser, postCreateUser, postDeleteUser, postUpdateUser , } from "controllers/user.controller";
import express, {Express} from "express" ;
import passport from "passport";
import fileUploadMiddleware from "src/middleware/multer";

const router = express.Router() 
const webRoutes = (app :Express) => {
    //src\views
    //client route
    // router.get("/", getHomePage);
    // router.get("/product/:id", getProductPage);
    // router.get("/login", getLoginPage); 
    // router.get("/register", getRegisterPage); 
    // router.post("/register", postRegister); 
    //phan quyen
    // router.get("/success-redirect", getSuccessRedirectPage)
    router.post('/login/', passport.authenticate('local', {
        successReturnToOrRedirect: '/success-redirect',
        failureRedirect: '/login', 
        failureMessage: true
    }));

    // router.post('/add-product-to-cart/:id' , postAddProductToCart)
    // router.get("/cart", getCartPage) 
    // router.post("/delete-product-in-cart/:id", postDeleteProductInCart);
    // router.get("/checkout", getCheckOutPage);


    //giong nhau url van ko van de j  
    //admin routes
    router.get("/admin",getDashboardPage);
    //user
    router.get("/admin/user", getAdminUserPage);
    router.get("/admin/create-user", getCreateUserPage); 
    router.post("/admin/handle-create-user", fileUploadMiddleware('avatar'), postCreateUser); 
    router.post("/admin/delete-user/:id", postDeleteUser);
    router.get("/admin/view-user/:id", getViewUser);
    router.post("/admin/update-user",  fileUploadMiddleware('avatar'),postUpdateUser); 
    //  router.post("/logout", postLogout);

    
    // router.get("/admin/order", getAdminOrderPage);

    //product
    // router.get("/admin/create-product" , getCreateProductPage)
    // router.get("/admin/product", getAdminProductPage);
    // router.post("/admin/handle-create-product", fileUploadMiddleware('image' , "images/product"), postCreateProductPage); 
    // router.get("/admin/view-product/:id", getViewProduct); 
    // router.post("/admin/delete-product/:id", postDeleteProductPage); 
    // router.post("/admin/update-product", fileUploadMiddleware('image' , "images/product"), postUpdateProductPage); 
  
    router.get("/admin/room", getAdminRoomPage);
    router.get("/admin/booking", getAdminBookingPage);
    router.get("/admin/payment", getAdminPaymentPage);
    app.use('/' , router); 
}


export default webRoutes ; 