import { Router } from "express";
import { authGuard } from "../../middlewares/auth";
import { roleGuard } from "../../middlewares/roleGuard";
import { validateBody } from "../../middlewares/validateBody";
import {
  CreateBranchSchema,
  UpdateBranchSchema,
  AssignStaffSchema,
} from "./branches.schema";
import * as controller from "./branches.controller";

const router = Router();

// 1. Public / Customer: Ambil daftar cabang aktif
router.get("/", controller.getAllBranches);
router.get("/:id", controller.getBranchById);

// 2. Owner & Admin Management
router.post(
  "/",
  authGuard,
  roleGuard("owner", "admin"),
  validateBody(CreateBranchSchema),
  controller.createBranch
);

router.patch(
  "/:id",
  authGuard,
  roleGuard("owner", "admin", "manager"),
  validateBody(UpdateBranchSchema),
  controller.updateBranch
);

router.get(
  "/staff/all",
  authGuard,
  roleGuard("owner", "admin"),
  controller.getAllStaff
);

router.post(
  "/staff/assign",
  authGuard,
  roleGuard("owner", "admin"),
  validateBody(AssignStaffSchema),
  controller.assignStaff
);

export default router;
