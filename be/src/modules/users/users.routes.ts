import { Router } from "express";
import { authGuard } from "../../middlewares/auth";
import { roleGuard } from "../../middlewares/roleGuard";
import * as controller from "./users.controller";

const router = Router();

router.get("/getMe", authGuard, controller.getMe);
router.delete("/deleteAllUsers", authGuard, roleGuard("owner", "admin"), controller.deleteAllUsers);
export default router;
