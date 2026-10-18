import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { AppError } from "../../utils/appError";

export class AdminController {
  static async getOverview(req: Request, res: Response) {
    try {
      const period = (req.query.period as string) || "30d";
      const data = await AdminService.getOverview(period);
      res.status(200).json({
        status: "success",
        data,
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ==========================================
  // ORDERS MANAGEMENT (tb_orders)
  // ==========================================
  static async getAllOrders(req: Request, res: Response) {
    try {
      const statusFilter = req.query.status as string | undefined;
      const period = req.query.period as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const orders = await AdminService.getAllOrders(statusFilter, limit, period);
      res.status(200).json({ status: "success", data: orders });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async updateOrderStatus(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { status } = req.body;
      if (!status) {
        throw new AppError("Status pesanan wajib diisi", 400);
      }
      const updated = await AdminService.updateOrderStatus(id, status);
      res.status(200).json({ status: "success", data: updated });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ status: "error", message: error.message });
    }
  }

  // ==========================================
  // STAFF MANAGEMENT (tb_staff)
  // ==========================================
  static async getAllStaff(req: Request, res: Response) {
    try {
      const staff = await AdminService.getAllStaff();
      res.status(200).json({ status: "success", data: staff });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async createStaff(req: Request, res: Response) {
    try {
      const { username, password, nama, role } = req.body;
      const created = await AdminService.createStaff({
        username,
        passwordPlain: password,
        nama,
        role,
      });
      res.status(201).json({ status: "success", data: created });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ status: "error", message: error.message });
    }
  }

  static async deleteStaff(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await AdminService.deleteStaff(id);
      res.status(200).json({ status: "success", message: "Staf berhasil dihapus" });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ status: "error", message: error.message });
    }
  }

  // ==========================================
  // INVENTORY / BAHAN BAKU
  // ==========================================
  static async getInventory(req: Request, res: Response) {
    try {
      const items = await AdminService.getAllBahanBaku();
      res.status(200).json({ status: "success", data: items });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async createInventoryItem(req: Request, res: Response) {
    try {
      const { nama_bahan, kategori, satuan, stok_saat_ini, stok_minimum, harga_per_satuan, supplier } = req.body;
      if (!nama_bahan || !satuan) {
        throw new AppError("Nama bahan dan satuan wajib diisi", 400);
      }
      const item = await AdminService.createBahanBaku({
        nama_bahan,
        kategori: kategori || "Bahan Basah",
        satuan,
        stok_saat_ini: Number(stok_saat_ini) || 0,
        stok_minimum: Number(stok_minimum) || 0,
        harga_per_satuan: Number(harga_per_satuan) || 0,
        supplier,
      });
      res.status(201).json({ status: "success", data: item });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ status: "error", message: error.message });
    }
  }

  static async updateInventoryItem(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const item = await AdminService.updateBahanBaku(id, req.body);
      res.status(200).json({ status: "success", data: item });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async deleteInventoryItem(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await AdminService.deleteBahanBaku(id);
      res.status(200).json({ status: "success", message: "Bahan baku berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ==========================================
  // RECIPES & HPP
  // ==========================================
  static async getRecipes(req: Request, res: Response) {
    try {
      const produkId = req.query.produk_id ? String(req.query.produk_id) : undefined;
      const data = await AdminService.getAllRecipes(produkId);
      res.status(200).json({ status: "success", data });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async getProductRecipes(req: Request, res: Response) {
    try {
      const produkId = String(req.params.produkId);
      const data = await AdminService.getRecipesByProduct(produkId);
      res.status(200).json({ status: "success", data });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async addRecipeItem(req: Request, res: Response) {
    try {
      const produk_id = req.body.produk_id;
      const bahan_id = req.body.bahan_baku_id || req.body.bahan_id;
      const jumlah_pakai = req.body.jumlah_pakai;

      if (!produk_id || !bahan_id || !jumlah_pakai) {
        throw new AppError("Produk, bahan, dan jumlah pakai wajib diisi", 400);
      }
      await AdminService.addRecipeItem(produk_id, bahan_id, Number(jumlah_pakai));
      res.status(200).json({ status: "success", message: "Komposisi resep berhasil disimpan" });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ status: "error", message: error.message });
    }
  }

  static async deleteRecipeItem(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await AdminService.deleteRecipeItem(id);
      res.status(200).json({ status: "success", message: "Komposisi resep berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ==========================================
  // OPERATING EXPENSES
  // ==========================================
  static async getExpenses(req: Request, res: Response) {
    try {
      const items = await AdminService.getAllExpenses();
      res.status(200).json({ status: "success", data: items });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async createExpense(req: Request, res: Response) {
    try {
      const { kategori, nama_biaya, nama_pengeluaran, keterangan, nominal, tanggal } = req.body;
      if (!nominal) {
        throw new AppError("Nominal pengeluaran wajib diisi", 400);
      }
      const item = await AdminService.createExpense({
        kategori: kategori || "OPERASIONAL",
        nama_biaya: nama_biaya || nama_pengeluaran,
        keterangan,
        nominal: Number(nominal),
        tanggal,
      });
      res.status(201).json({ status: "success", data: item });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ status: "error", message: error.message });
    }
  }

  static async updateExpense(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const updated = await AdminService.updateExpense(id, req.body);
      res.status(200).json({ status: "success", data: updated });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ status: "error", message: error.message });
    }
  }

  static async deleteExpense(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await AdminService.deleteExpense(id);
      res.status(200).json({ status: "success", message: "Biaya operasional berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
}
