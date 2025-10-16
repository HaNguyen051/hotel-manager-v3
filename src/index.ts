///<reference path="./types/index.d.ts" />

import express, {Express} from "express" ;
import 'dotenv/config'

import session from 'express-session';
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { PrismaClient } from "@prisma/client";
import passport from "passport";
import configPassportLocal from "./types/passport.local";
import webRoutes from "./routes/web";
import initDatabase from "config/seed";


const app: Express = express();
const port = process.env.PORT || 8000;
// Config view engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Config body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Config static files
app.use(express.static('public'));


//sesion
app.use(session({
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000 // ms
    },
    secret: 'a santa at nasa',

    //Forces session save even if unchanged
    resave: false,

    //Saves unmodified sessions
    saveUninitialized: false,
    store: new PrismaSessionStore(
        new PrismaClient(),
        {
            //Clears expired sessions every 1 day
            checkPeriod: 1 * 24 * 60 * 60 * 1000,  //ms
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        })
}))
app.use(passport.initialize());
app.use(passport.authenticate('session'));

configPassportLocal;


//config global

app.use((req, res, next) => {
    res.locals.user = req.user || null; // Pass user object to all views
    next();
});
//config route
webRoutes(app); 

// authRoutes(app);


//seeding da();
 initDatabase();

app.use((req, res) => {
  return res.render('status/404.ejs'); 
})

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
}); 