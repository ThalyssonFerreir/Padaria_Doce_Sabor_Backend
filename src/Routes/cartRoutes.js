import { Router } from "express";
import { postCart, getCart, deleteCart } from "../controllers/cartController.js";

const router = Router();

router.post("/", postCart);
router.get("/", getCart);
router.delete("/", deleteCart);

export default router;
