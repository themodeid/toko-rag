import { Router } from "express";
import { authGuard } from "../../middlewares/auth";
import { roleGuard } from "../../middlewares/roleGuard";
import * as controller from "./users.controller";

const router = Router();

router.get("/getMe", authGuard, controller.getMe);
router.get("/all", authGuard, roleGuard("owner", "admin"), controller.getAllUsers);

// Staff management (Owner & Manager)
router.get("/staff", authGuard, roleGuard("owner", "admin", "manager"), controller.getAllStaff);
router.post("/staff", authGuard, roleGuard("owner", "admin", "manager"), controller.createStaff);
router.patch("/staff/:id", authGuard, roleGuard("owner", "admin", "manager"), controller.updateStaff);
router.delete("/staff/:id", authGuard, roleGuard("owner", "admin"), controller.deleteStaff);

router.delete("/deleteAllUsers", authGuard, roleGuard("owner", "admin"), controller.deleteAllUsers);
export default router;
