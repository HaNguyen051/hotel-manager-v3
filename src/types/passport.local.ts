
import { prisma } from "../config/client";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { getUserWithRoleById } from "../services/client/auth.service";



const configPassportLocal = () => {
    passport.use(new LocalStrategy({
        passReqToCallback: true
    }, async function verify(req, username, password, callback) {

        const { session } = req as any;
        if (session?.messages?.length) {
            session.messages = [];
        }

        console.log(">>> check username/password: ", username, password)
        //check user exist in database
        const user = await prisma.user.findUnique({
            where: { username }
        })
        if (!user) {
            //throw error
            // throw new Error(`Username: ${username} not found`);
            return callback(null, false, { message: `Invalid Username/password` });
        }

        //compare password
        // const isMatch = await comparePassword(password, user.password);
        // if (!isMatch) {
        //     // throw new Error(`Invalid password`);
        //     return callback(null, false, { message: `Invalid Username/password` });

        // }

        // return callback(null, user as any);
    }));

    passport.serializeUser(function (user: any, callback) {
        callback(null, { id: user.id, username: user.username });
    });

    passport.deserializeUser(async function (user: any, callback) {
        const { id, username } = user;
        //query to database
        const userInDB: any = await getUserWithRoleById(id);
      
        return callback(null, { ...userInDB, });
    });
}

export default configPassportLocal;
