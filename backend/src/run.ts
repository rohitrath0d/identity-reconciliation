// import express, {Request, Response} from 'express'; // gives verbatimModuleSyntax by typescript type error handling
import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv"
// import {DBConnection} from "./db/init_db.ts"
import {DBConnection} from "./db/init_db.js"
// import identification_process_routes from "./routes/identification_process_routes.ts"
import identification_process_routes from "./routes/identification_process_routes.js"


dotenv.config()

const app = express();
app.use(express.json());

DBConnection()


// routes
// app.use('/api', identification_process_routes)
app.use('/api', identification_process_routes)

const PORT = process.env.PORT || 3001;


app.get('/', (_req: Request, res: Response) => {
  res.json("this is the backend home route by identity-reconciliation, hey there!")
});

app.listen(PORT, () => {
  console.log(`Server is all up and running on port ${PORT}`);
});

export {app};       // Exporting the app for testing purposes - so that jest can access it, make the right configs and api's calls, and run the tests
