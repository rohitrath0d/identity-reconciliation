import express from "express";
// import {identificationProcess} from "../controllers/identification_process.ts"
import {identificationProcess} from "../controllers/identification_process.js"

const router  = express.Router();


router.post("/identify", identificationProcess)


export default router;