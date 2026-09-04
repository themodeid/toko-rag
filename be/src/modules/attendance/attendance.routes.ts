import { Router } from "express";
import { authGuard } from "../../middlewares/auth";
import { roleGuard } from "../../middlewares/roleGuard";
import { validateBody } from "../../middlewares/validateBody";
import { ClockInSchema, ClockOutSchema } from "./attendance.schema";
import * as controller from "./attendance.controller";

const router = Router();

// Wajib login untuk seluruh endpoint absensi
router.use(authGuard);

// Endpoint absensi staff (Karyawan, Manager, Owner)
router.post("/clock-in", validateBody(ClockInSchema), controller.clockIn);
router.post("/clock-out", validateBody(ClockOutSchema), controller.clockOut);
router.get("/today", controller.getTodayAttendance);

// Rekap absensi (Owner, Admin, Karyawan)
router.get("/recap", roleGuard("owner", "admin", "karyawan"), controller.getAttendanceRecap);

export default router;
