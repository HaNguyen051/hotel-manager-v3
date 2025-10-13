
import express, {Express} from "express" ;
import 'dotenv/config'
import webAdmin from "./routes/admin";
import webUser from "./routes/client";
import authRoutes from "./routes/auth";
const app: Express = express();
const port = process.env.PORT || 8000;
import session from 'express-session';
// Config view engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Config body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Config static files
app.use(express.static('public'));


// ✅ Config Session - THÊM ĐOẠN NÀY
app.use(session({
  secret: process.env.SESSION_SECRET || 'ha-nguyen-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true nếu dùng HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
//config route
webAdmin(app); 
webUser(app); 
authRoutes(app);


//seeding data 
// initDatabase(); 

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
}); 