import { Router } from "express";
import { authGuard } from "../../middlewares/auth";
import { roleGuard } from "../../middlewares/roleGuard";
import { validateBody } from "../../middlewares/validateBody";
import { CreateExpenseSchema } from "./reports.schema";
import * as controller from "./reports.controller";

const router = Router();

// Seluruh endpoint laporan & analitik hanya boleh diakses oleh OWNER / ADMIN
router.use(authGuard, roleGuard("owner", "admin"));

// Laporan Keuangan (Omzet, HPP, Margin, Laba Bersih)
router.get("/analytics", controller.getFinancialAnalytics);

// Catatan Pengeluaran Operasional
router.get("/expenses", controller.getExpenses);
router.post("/expenses", validateBody(CreateExpenseSchema), controller.createExpense);
router.delete("/expenses/:id", controller.deleteExpense);

export default router;
