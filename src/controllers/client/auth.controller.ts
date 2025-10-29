
import { NextFunction, Request, Response } from "express";
import { registerNewUser } from "services/client/auth.service";
import { RegisterSchema, TRegisterSchema } from "src/validation/register.schema";
const { PrismaClient } = require('@prisma/client');


const getLoginPage = async (req: Request, res: Response) => {
    const { session, query } = req as any; 
    const messages = session?.messages ?? []; 

    // ✅ Kiểm tra nếu có ?registered=success trên URL
    const registered = query.registered === "success";

    return res.render("client/auth/login.ejs", {
        messages,
        registered, // truyền biến sang EJS
    }); 
}

const getRegisterPage = async (req: Request, res: Response) => {
    const errors = []; 
    const oldData = {
        fullName: "", 
        email: "", 
        password: "",
        confirmPassword:""
    }
    return res.render("client/auth/register.ejs", {
        errors, 
        oldData
    }); 
}
const postRegister = async (req: Request, res: Response) => {
    const { fullName, email, password, confirmPassword } = req.body as TRegisterSchema; 
    // const {name , price , detailDesc , shortDesc , quantity , factory , target} = req.body as TProductSchema ; 
    const validate =await RegisterSchema.safeParseAsync(req.body); 
    if (!validate.success)
    {
        //error
        const errorsZod  = validate.error.issues; 
        const errors = errorsZod?.map(item => `${item.message} (${item.path[0]})`); 
        const oldData = {
          fullName , email , password , confirmPassword
        }
        return res.render("client/auth/register.ejs", {
            errors,
            oldData
        });
           
    }
//success
await registerNewUser(fullName, email, password);

// ✅ Chuyển sang trang login kèm thông báo đăng ký thành công
return res.redirect("/login?registered=success");

}
const getSuccessRedirectPage = async (req: Request, res: Response) => {
    const user = req.user ;
    if (user?.role?.name === "ADMIN") {
        res.redirect("/admin")
    } else res.redirect("/")

}
const postLogout = async (req: Request, res: Response , next :NextFunction) => {
        req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
}

export { getLoginPage, getRegisterPage , postRegister , getSuccessRedirectPage , postLogout}; 
