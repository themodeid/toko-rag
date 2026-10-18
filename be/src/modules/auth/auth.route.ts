import { Router } from "express";
import * as controller from "./auth.controller";
import { validateBody } from "../../middlewares/validateBody";
import { RegisterSchema, LoginSchema } from "./auth.schema";

import { authGuard } from "../../middlewares/auth";

const router = Router();

// Register routes
router.post("/register", validateBody(RegisterSchema), controller.registerUser);
router.post("/registerUser", validateBody(RegisterSchema), controller.registerUser);
router.post("/registerAdmin", validateBody(RegisterSchema), controller.registerAdmin);
router.post("/login", validateBody(LoginSchema), controller.login);
router.post("/logout", controller.logout);

// Get current logged-in user profile
router.get("/me", authGuard, (req, res) => {
  res.json({
    status: "success",
    data: (req as any).user,
  });
});

export default router;
