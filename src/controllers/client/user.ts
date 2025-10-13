import { Request, Response } from "express";


const getHomePage = async (req : Request, res : Response) => {
    return res.render("client/homepage.ejs")
 
}




export { getHomePage }; 