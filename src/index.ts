
import express, {Express} from "express" ;
import 'dotenv/config'
import webAdmin from "./routes/admin";
import webUser from "./routes/client";

const app: Express = express();
const port = process.env.PORT || 8080;

// Config view engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Config body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Config static files
app.use(express.static('public'));

//config route
webAdmin(app); 
webUser(app); 


//seeding data 
// initDatabase(); 

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
}); 