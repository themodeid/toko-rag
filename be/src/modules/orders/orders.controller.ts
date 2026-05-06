import { Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { pool } from "../../config/database";

// checkout penting
export const checkout = catchAsync(async (req: Request, res: Response) => {
  const { items } = req.body;
  const userId = req.user.id;

  if (!items || items.length === 0) {
    throw new AppError("Item order tidak boleh kosong", 400);
  }

  for (const item of items) {
    if (!item.produk_id || typeof item.produk_id !== "string") {
      throw new AppError("ID produk tidak valid", 404);
    }
    if (!item.quantity || item.quantity <= 0) {
      throw new AppError("Quantity harus lebih dari 0", 400);
    }
  }

  const produkIds = items.map((i: any) => i.produk_id);

  const produkQuery = `
    SELECT id, nama, harga, stock, status
    FROM produk
    WHERE id = ANY($1::uuid[])
  `;

  const produkResult = await pool.query(produkQuery, [produkIds]);
  const products = produkResult.rows;

  if (products.length !== items.length) {
    throw new AppError("Ada produk yang tidak ditemukan", 400);
  }

  const unavailable = products.find((p) => p.status === false);
  if (unavailable) {
    throw new AppError(
      `Produk ${unavailable.nama} tidak tersedia untuk dipesan`,
      400,
    );
  }

  const orderItems = items.map((item: any) => {
    const produk = products.find((p) => p.id === item.produk_id)!;

    if (produk.stock < item.quantity) {
      throw new AppError(`Stok ${produk.nama} tidak cukup`, 400);
    }

    return {
      produk_id: produk.id,
      harga: produk.harga,
      quantity: item.quantity,
      subtotal: produk.harga * item.quantity,
    };
  });

  const total_price = orderItems.reduce((acc, item) => acc + item.subtotal, 0);

  // hitung batas hari
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ INSERT ORDER DULU
    const orderQuery = `
    INSERT INTO orders (auth_id, total_price, status_pesanan)
    VALUES ($1, $2, 'ANTRI')
    RETURNING id
  `;

    const orderResult = await client.query(orderQuery, [userId, total_price]);

    const orderId = orderResult.rows[0].id;

    // ==============================
    // 🔥 TARUH CODE ANTRIAN DI SINI
    // ==============================

    const queueResult = await client.query(
      `
    SELECT queue_number
    FROM daily_queue
    WHERE queue_date = $1
    ORDER BY queue_number DESC
    LIMIT 1
    FOR UPDATE
    `,
      [today],
    );

    let queueNumber = 1;

    if (queueResult.rows.length > 0) {
      queueNumber = queueResult.rows[0].queue_number + 1;
    }

    await client.query(
      `
    INSERT INTO daily_queue (order_id, queue_number, queue_date)
    VALUES ($1, $2, $3)
    `,
      [orderId, queueNumber, today],
    );

    const itemsQuery = `
    INSERT INTO order_items
    (order_id, produk_id, harga_barang, quantity, subtotal)
    VALUES ${orderItems
      .map(
        (_, i) =>
          `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`,
      )
      .join(", ")}
  `;

    const values = orderItems.flatMap((item) => [
      orderId,
      item.produk_id,
      item.harga,
      item.quantity,
      item.subtotal,
    ]);

    await client.query(itemsQuery, values);

    // 📉 UPDATE STOCK
    for (const item of orderItems) {
      await client.query("UPDATE produk SET stock = stock - $1 WHERE id = $2", [
        item.quantity,
        item.produk_id,
      ]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Checkout berhasil",
      order_id: orderId,
      no_antrian: queueNumber,
      total_price,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

// cancel order penting

export const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role.toUpperCase(); // normalize ke uppercase

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // lock order yang mau dicancel
    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [id],
    );

    const order = orderResult.rows[0];

    if (!order) {
      throw new AppError("Order tidak ditemukan", 404);
    }

    // cek hak akses: admin bisa cancel semua, user hanya order sendiri
    if (order.user_id !== userId && userRole !== "ADMIN") {
      throw new AppError("Tidak boleh cancel order orang lain", 403);
    }

    // hanya user biasa yang dibatasi status ANTRI & top 3
    if (userRole !== "ADMIN") {
      if (order.status_pesanan !== "ANTRI") {
        throw new AppError("Order tidak bisa dibatalkan", 400);
      }

      // ambil 3 antrian teratas (lock juga)
      const topThree = await client.query(`
        SELECT id
        FROM orders
        WHERE status_pesanan = 'ANTRI'
        ORDER BY created_at ASC
        LIMIT 3
        FOR UPDATE
      `);

      const topThreeIds = topThree.rows.map((row) => row.id);

      if (topThreeIds.includes(id)) {
        throw new AppError(
          "Order sedang diproses dan tidak bisa dibatalkan",
          400,
        );
      }
    }

    // kembalikan stok
    const items = await client.query(
      `SELECT produk_id, quantity FROM order_items WHERE order_id = $1`,
      [id],
    );

    for (const item of items.rows) {
      await client.query(`UPDATE produk SET stock = stock + $1 WHERE id = $2`, [
        item.quantity,
        item.produk_id,
      ]);
    }

    // update status
    await client.query(
      `UPDATE orders SET status_pesanan = 'DIBATALKAN' WHERE id = $1`,
      [id],
    );

    await client.query("COMMIT");

    res.json({ message: "Order berhasil dibatalkan" });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

// menyelesaikan order
export const doneOrders = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // lock order yang mau dicancel
    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [id],
    );

    const order = orderResult.rows[0];

    if (!order) {
      throw new AppError("order tidak ditemukan", 404);
    }

    await client.query(
      `UPDATE orders SET status_pesanan = 'SELESAI' WHERE id = $1  `,
      [id],
    );

    await client.query("COMMIT");

    res.json({ message: "Order berhasil diselesaikan" });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const getMyOrdersActive = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;

    const query = `
    SELECT *
    FROM orders
    WHERE auth_id = $1
    AND status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
    ORDER BY created_at DESC
  `;

    const result = await pool.query(query, [userId]);

    res.status(200).json({
      message: "Berhasil mengambil pesanan anda",
      data: result.rows,
    });
  },
);

// mengambil item dari orderan
export const getOrdersItems = catchAsync(
  async (req: Request, res: Response) => {
    const orderId = req.params.id;

    const result = await pool.query(
      `
    SELECT 
      oi.produk_id,
      p.nama AS nama_produk,
      oi.harga_barang,
      oi.quantity
    FROM order_items oi
    INNER JOIN produk p
      ON oi.produk_id = p.id
    WHERE oi.order_id = $1
    `,
      [orderId],
    );

    res.status(200).json({
      message: "Berhasil mengambil item order",
      orderId,
      items: result.rows,
    });
  },
);

// mengambil semua orderan aktif beserta item didalamnya
export const getOrdersActiveWithItems = catchAsync(
  async (req: Request, res: Response) => {
    const query = `
      SELECT 
        o.id,
        o.auth_id,
        u.username,
        o.total_price,
        o.status_pesanan,
        o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'produk_id', oi.produk_id,
              'nama_produk', p.nama,
              'harga_barang', oi.harga_barang,
              'quantity', oi.quantity,
              'subtotal', oi.subtotal,
              'queue_number', dq.queue_number,
              'image', p.image
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      INNER JOIN auth u 
        ON o.auth_id = u.id
      LEFT JOIN order_items oi 
        ON o.id = oi.order_id
      LEFT JOIN produk p 
        ON oi.produk_id = p.id
      LEFT JOIN daily_queue dq
        ON dq.order_id = o.id
      WHERE o.status_pesanan IN ('ANTRI', 'DIPROSES') 
      GROUP BY o.id, u.username
      ORDER BY o.created_at ASC
    `;

    const result = await pool.query(query);

    res.status(200).json({
      message: "Berhasil mengambil seluruh pesanan aktif beserta itemnya",
      total: result.rows.length,
      data: result.rows,
    });
  },
);

// mengambil semua pesanan saya yang aktif beserta item didalamnya
export const getMyOrdersActiveWithItems = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;

    const query = `
  SELECT 
    o.id,
    o.auth_id,
    o.total_price,
    o.status_pesanan,
    o.created_at,
    COALESCE(
      json_agg(
        json_build_object(
          'produk_id', oi.produk_id,
          'nama_produk', p.nama,
          'harga_barang', oi.harga_barang,
          'quantity', oi.quantity,
          'queue_number', dq.queue_number,
          'image', p.image
        )
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'
    ) AS items
  FROM orders o
  LEFT JOIN order_items oi 
    ON o.id = oi.order_id
  LEFT JOIN produk p 
    ON oi.produk_id = p.id
  LEFT JOIN daily_queue dq
    ON dq.order_id = o.id
  WHERE o.auth_id = $1
  AND o.status_pesanan IN ('ANTRI', 'DIPROSES')
  GROUP BY o.id
  ORDER BY o.created_at DESC
`;

    const result = await pool.query(query, [userId]);

    res.status(200).json({
      message: "Berhasil mengambil pesanan aktif anda beserta itemnya",
      total: result.rows.length,
      data: result.rows,
    });
  },
);

// mengambil seluruh pesanan saya beserta item didalamnya
export const getMyAllOrdersWithItems = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;

    const query = `
      SELECT 
        o.id,
        o.auth_id,
        o.total_price,
        o.status_pesanan,
        o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'produk_id', oi.produk_id,
              'nama_produk', p.nama,
              'harga_barang', oi.harga_barang,
              'quantity', oi.quantity,
              'image', p.image,
              'queue_number', dq.queue_number
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi 
        ON o.id = oi.order_id
      LEFT JOIN produk p 
        ON oi.produk_id = p.id
      LEFT JOIN daily_queue dq
        ON dq.order_id = o.id
      WHERE o.auth_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.status(200).json({
      message: "Berhasil mengambil semua pesanan anda",
      total: result.rows.length,
      data: result.rows,
    });
  },
);

