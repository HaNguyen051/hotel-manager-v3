//hehehe
import express, { Express } from "express";
import { getHomePage,  } from "../controllers/client/user";
const router = express.Router() 
const webUser = (app :Express) => {

    //src\views
    router.get("/", getHomePage);
    // router.get("/login", getLogin);
    // router.get("/createAccount", getCreateAccount);
    // router.get("/contact.html", getContact);
    // router.get("/", getHomePage);
    // router.get("/",getHomePage);
    
    app.use('/', router); 
}


export default webUser ; 