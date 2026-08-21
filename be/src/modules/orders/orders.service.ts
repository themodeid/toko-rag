import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";

export interface CheckoutItemInput {
  produk_id: string;
  quantity: number;
}

export const checkoutService = async (
  userId: string,
  items: CheckoutItemInput[]
) => {
  if (!items || items.length === 0) {
    throw new AppError("Item order tidak boleh kosong", 400);
  }

  for (const item of items) {
    if (!item.produk_id || typeof item.produk_id !== "string") {
      throw new AppError("ID produk tidak valid", 400);
    }
    if (!item.quantity || item.quantity <= 0) {
      throw new AppError("Quantity harus lebih dari 0", 400);
    }
  }

  const produkIds = items.map((i) => i.produk_id);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Ambil produk dan lock untuk update stok
    const produkResult = await client.query(
      `
      SELECT id, nama, harga, stock, status
      FROM produk
      WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL
      FOR UPDATE
      `,
      [produkIds]
    );

    const products = produkResult.rows;

    if (products.length !== items.length) {
      throw new AppError("Ada produk yang tidak ditemukan atau sudah tidak aktif", 400);
    }

    const unavailable = products.find((p) => p.status === false);
    if (unavailable) {
      throw new AppError(
        `Produk '${unavailable.nama}' saat ini tidak tersedia untuk dipesan`,
        400
      );
    }

    const orderItems = items.map((item) => {
      const produk = products.find((p) => p.id === item.produk_id)!;

      if (produk.stock < item.quantity) {
        throw new AppError(
          `Stok '${produk.nama}' tidak mencukupi (Tersisa: ${produk.stock}, Diminta: ${item.quantity})`,
          400
        );
      }

      return {
        produk_id: produk.id,
        harga: produk.harga,
        quantity: item.quantity,
        subtotal: produk.harga * item.quantity,
      };
    });

    const totalPrice = orderItems.reduce((acc, item) => acc + item.subtotal, 0);

    // 2. Hitung tanggal & nomor antrian harian
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3. Insert order
    const orderResult = await client.query(
      `
      INSERT INTO orders (auth_id, total_price, status_pesanan)
      VALUES ($1, $2, 'ANTRI')
      RETURNING id, auth_id, total_price, status_pesanan, created_at
      `,
      [userId, totalPrice]
    );

    const orderId = orderResult.rows[0].id;

    // 4. Hitung antrian hari ini dengan row lock
    const queueResult = await client.query(
      `
      SELECT queue_number
      FROM daily_queue
      WHERE queue_date = $1
      ORDER BY queue_number DESC
      LIMIT 1
      FOR UPDATE
      `,
      [today]
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
      [orderId, queueNumber, today]
    );

    // 5. Insert order items
    const itemsQuery = `
      INSERT INTO order_items (order_id, produk_id, harga_barang, quantity, subtotal)
      VALUES ${orderItems
        .map(
          (_, i) =>
            `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
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

    // 6. Update stok produk
    for (const item of orderItems) {
      await client.query(
        "UPDATE produk SET stock = stock - $1 WHERE id = $2",
        [item.quantity, item.produk_id]
      );
    }

    await client.query("COMMIT");

    return {
      orderId,
      queueNumber,
      totalPrice,
      order: orderResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const cancelOrderService = async (
  orderId: string,
  userId: string,
  userRole: string
) => {
  const normalizedRole = userRole.toUpperCase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock order yang akan dibatalkan
    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    const order = orderResult.rows[0];
    if (!order) {
      throw new AppError("Order tidak ditemukan", 404);
    }

    // Role check: admin bisa batalkan order siapapun, user hanya miliknya sendiri
    if (order.auth_id !== userId && normalizedRole !== "ADMIN") {
      throw new AppError("Tidak diizinkan membatalkan order pengguna lain", 403);
    }

    if (order.status_pesanan === "DIBATALKAN") {
      throw new AppError("Order sudah dibatalkan sebelumnya", 400);
    }

    if (order.status_pesanan === "SELESAI") {
      throw new AppError("Order yang sudah selesai tidak dapat dibatalkan", 400);
    }

    // Batasan user biasa: hanya status ANTRI dan bukan 3 antrian teratas
    if (normalizedRole !== "ADMIN") {
      if (order.status_pesanan !== "ANTRI") {
        throw new AppError("Order sedang diproses dan tidak bisa dibatalkan", 400);
      }

      const topThree = await client.query(`
        SELECT id
        FROM orders
        WHERE status_pesanan = 'ANTRI'
        ORDER BY created_at ASC
        LIMIT 3
        FOR UPDATE
      `);

      const topThreeIds = topThree.rows.map((row) => row.id);
      if (topThreeIds.includes(orderId)) {
        throw new AppError(
          "Order masuk dalam antrian prioritas yang sedang disiapkan dan tidak bisa dibatalkan",
          400
        );
      }
    }

    // Kembalikan stok produk
    const itemsResult = await client.query(
      `SELECT produk_id, quantity FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE produk SET stock = stock + $1 WHERE id = $2`,
        [item.quantity, item.produk_id]
      );
    }

    // Update status order
    await client.query(
      `UPDATE orders SET status_pesanan = 'DIBATALKAN' WHERE id = $1`,
      [orderId]
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const doneOrderService = async (orderId: string) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    const order = orderResult.rows[0];
    if (!order) {
      throw new AppError("Order tidak ditemukan", 404);
    }

    if (order.status_pesanan === "DIBATALKAN") {
      throw new AppError("Order sudah dibatalkan", 400);
    }

    await client.query(
      `UPDATE orders SET status_pesanan = 'SELESAI' WHERE id = $1`,
      [orderId]
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getMyOrdersActiveService = async (userId: string) => {
  const query = `
    SELECT *
    FROM orders
    WHERE auth_id = $1
      AND status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const getOrderItemsService = async (orderId: string) => {
  const query = `
    SELECT 
      oi.produk_id,
      p.nama AS nama_produk,
      oi.harga_barang,
      oi.quantity,
      oi.subtotal
    FROM order_items oi
    INNER JOIN produk p ON oi.produk_id = p.id
    WHERE oi.order_id = $1
  `;
  const result = await pool.query(query, [orderId]);
  return result.rows;
};

export const getOrdersActiveWithItemsService = async () => {
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
    INNER JOIN auth u ON o.auth_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN produk p ON oi.produk_id = p.id
    LEFT JOIN daily_queue dq ON dq.order_id = o.id
    WHERE o.status_pesanan IN ('ANTRI', 'DIPROSES') 
    GROUP BY o.id, u.username
    ORDER BY o.created_at ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

export const getMyOrdersActiveWithItemsService = async (userId: string) => {
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
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN produk p ON oi.produk_id = p.id
    LEFT JOIN daily_queue dq ON dq.order_id = o.id
    WHERE o.auth_id = $1
      AND o.status_pesanan IN ('ANTRI', 'DIPROSES')
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const getMyAllOrdersWithItemsService = async (userId: string) => {
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
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN produk p ON oi.produk_id = p.id
    LEFT JOIN daily_queue dq ON dq.order_id = o.id
    WHERE o.auth_id = $1
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};
