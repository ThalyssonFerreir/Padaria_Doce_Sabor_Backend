import { Router } from "express";
import {getCustomerSales, getSellerSales, putSale, postSale,} from "../controllers/saleController.js";

const router = Router();

router.post("/", postSale);
router.put("/:id/cancel", putSale);
router.get("/customer/:customerId", getCustomerSales);
router.get("/seller/:sellerId", getSellerSales);

export default router;
