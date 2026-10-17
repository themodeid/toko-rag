import { Router } from "express";
import { AdminController } from "./admin.controller";

const router = Router();

// Overview dashboard metrics
router.get("/overview", AdminController.getOverview);

// Orders Management (tb_orders)
router.get("/orders", AdminController.getAllOrders);
router.patch("/orders/:id/status", AdminController.updateOrderStatus);

// Staff Management (tb_staff)
router.get("/staff", AdminController.getAllStaff);
router.post("/staff", AdminController.createStaff);
router.delete("/staff/:id", AdminController.deleteStaff);

// Inventory (Bahan Baku)
router.get("/inventory", AdminController.getInventory);
router.post("/inventory", AdminController.createInventoryItem);
router.put("/inventory/:id", AdminController.updateInventoryItem);
router.delete("/inventory/:id", AdminController.deleteInventoryItem);

// Recipes & HPP Engine
router.get("/recipes", AdminController.getRecipes);
router.get("/recipes/product/:produkId", AdminController.getProductRecipes);
router.post("/recipes", AdminController.addRecipeItem);
router.delete("/recipes/:id", AdminController.deleteRecipeItem);

// Operating Expenses
router.get("/expenses", AdminController.getExpenses);
router.post("/expenses", AdminController.createExpense);
router.put("/expenses/:id", AdminController.updateExpense);
router.delete("/expenses/:id", AdminController.deleteExpense);

export default router;
