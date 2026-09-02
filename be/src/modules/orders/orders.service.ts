import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";
import { createXenditInvoice } from "../../config/xendit";
import {
  createSnapTransaction,
  verifyMidtransSignature,
  MidtransNotificationPayload,
} from "../../config/midtrans";

export interface CheckoutItemInput {
  produk_id: string;
  quantity: number;
}

export interface CheckoutInput {
  items: CheckoutItemInput[];
  customer_name?: string;
  order_type?: "DINE_IN" | "TAKE_AWAY" | "DELIVERY";
  table_number?: string | null;
  customer_phone?: string | null;
  guest_token?: string | null;
}

export const checkoutService = async (
  userId: string | null | undefined,
  input: CheckoutInput
) => {
  const {
    items,
    customer_name,
    order_type = "DINE_IN",
    table_number,
    customer_phone,
    guest_token,
  } = input;

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

    // 1. Ambil data nama pemesan (dari user login atau input guest)
    let username = customer_name?.trim() || "Pelanggan";
    if (userId) {
      const userRes = await client.query("SELECT username FROM auth WHERE id = $1", [userId]);
      if (userRes.rows[0]?.username) {
        username = userRes.rows[0].username;
      }
    }

    // 2. Ambil produk dan lock untuk update stok
    const produkResult = await client.query(
      `
      SELECT id, nama, harga, COALESCE(hpp, ROUND(harga * 0.4)) AS hpp, stock, status
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
        nama: produk.nama,
        harga: produk.harga,
        harga_modal: Number(produk.hpp) || Math.round(produk.harga * 0.4),
        quantity: item.quantity,
        subtotal: produk.harga * item.quantity,
      };
    });

    const totalPrice = orderItems.reduce((acc, item) => acc + item.subtotal, 0);

    // 3. Insert order dengan status awal MENUNGGU_PEMBAYARAN & guest fields
    const orderResult = await client.query(
      `
      INSERT INTO orders (
        auth_id, customer_name, order_type, table_number, customer_phone, guest_token, total_price, status_pesanan, status_pembayaran
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'MENUNGGU_PEMBAYARAN', 'PENDING')
      RETURNING id, auth_id, customer_name, order_type, table_number, total_price, status_pesanan, status_pembayaran, created_at
      `,
      [
        userId || null,
        username,
        order_type,
        table_number || null,
        customer_phone || null,
        guest_token || null,
        totalPrice,
      ]
    );

    const orderId = orderResult.rows[0].id;

    // 4. Insert order items with historical modal / HPP
    const itemsQuery = `
      INSERT INTO order_items (order_id, produk_id, harga_barang, harga_modal, quantity, subtotal)
      VALUES ${orderItems
        .map(
          (_, i) =>
            `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
        )
        .join(", ")}
    `;

    const values = orderItems.flatMap((item) => [
      orderId,
      item.produk_id,
      item.harga,
      item.harga_modal,
      item.quantity,
      item.subtotal,
    ]);

    await client.query(itemsQuery, values);

    // 5. Reserve / kurangi stok produk
    for (const item of orderItems) {
      await client.query(
        "UPDATE produk SET stock = stock - $1 WHERE id = $2",
        [item.quantity, item.produk_id]
      );
    }

    // 6. Buat transaksi Xendit Invoice (Mendukung QRIS, VA, E-Wallet)
    let invoiceUrl = "";
    try {
      const xenditInvoice = await createXenditInvoice({
        orderId,
        amount: totalPrice,
        customerName: username,
        items: orderItems.map((item) => ({
          name: item.nama.slice(0, 50),
          quantity: item.quantity,
          price: item.harga,
        })),
      });
      invoiceUrl = xenditInvoice.invoice_url;
      console.log(`✅ Xendit Invoice created for Order #${orderId.slice(0, 8)}:`, invoiceUrl);
    } catch (xenditErr) {
      console.warn("⚠️ Xendit invoice generation fallback:", xenditErr);
    }

    // 7. Simpan Invoice URL / Snap Token ke database
    await client.query(
      "UPDATE orders SET snap_token = $1 WHERE id = $2",
      [invoiceUrl || `xendit_${orderId}`, orderId]
    );

    await client.query("COMMIT");

    return {
      orderId,
      invoiceUrl,
      redirectUrl: invoiceUrl,
      snapToken: invoiceUrl,
      totalPrice,
      statusPesanan: "MENUNGGU_PEMBAYARAN",
      order: {
        ...orderResult.rows[0],
        snap_token: invoiceUrl,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Handle Webhook Notifikasi dari Midtrans (Settlement, Expire, Cancel, Deny)
 */
export const handleMidtransWebhookService = async (
  notification: MidtransNotificationPayload
) => {
  const {
    order_id: orderId,
    transaction_status: transactionStatus,
    fraud_status: fraudStatus,
    payment_type: paymentType,
    transaction_id: transactionId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
  } = notification;

  if (!orderId) {
    throw new AppError("Order ID tidak valid dalam webhook", 400);
  }

  // Verifikasi Signature jika signatureKey disertakan
  if (signatureKey && statusCode && grossAmount) {
    const isValid = verifyMidtransSignature(
      orderId,
      statusCode,
      grossAmount,
      signatureKey
    );
    if (!isValid) {
      console.warn("⚠️ Midtrans Signature Mismatch for Order:", orderId);
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
      [orderId]
    );

    const order = orderRes.rows[0];
    if (!order) {
      console.warn("⚠️ Webhook received for non-existent order:", orderId);
      await client.query("ROLLBACK");
      return { success: false, message: "Order not found" };
    }

    const isPaid =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && (fraudStatus === "accept" || !fraudStatus));

    const isFailed =
      transactionStatus === "cancel" ||
      transactionStatus === "expire" ||
      transactionStatus === "deny";

    if (isPaid) {
      // 1. Update status pembayaran jadi PAID dan status pesanan jadi ANTRI
      await client.query(
        `UPDATE orders
         SET status_pembayaran = 'PAID',
             status_pesanan = 'ANTRI',
             payment_type = $1,
             midtrans_transaction_id = $2
         WHERE id = $3`,
        [paymentType || "qris", transactionId || null, orderId]
      );

      // 2. Terbitkan nomor antrian jika belum terdaftar di daily_queue
      const existingQueue = await client.query(
        "SELECT id, queue_number FROM daily_queue WHERE order_id = $1",
        [orderId]
      );

      if (existingQueue.rowCount === 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const queueResult = await client.query(
          `SELECT queue_number
           FROM daily_queue
           WHERE queue_date = $1
           ORDER BY queue_number DESC
           LIMIT 1
           FOR UPDATE`,
          [today]
        );

        let queueNumber = 1;
        if (queueResult.rows.length > 0) {
          queueNumber = queueResult.rows[0].queue_number + 1;
        }

        await client.query(
          `INSERT INTO daily_queue (order_id, queue_number, queue_date)
           VALUES ($1, $2, $3)`,
          [orderId, queueNumber, today]
        );
        console.log(`✅ Payment SUCCESS for Order ${orderId}. Queue #${queueNumber} issued!`);
      }
    } else if (isFailed) {
      if (order.status_pembayaran !== "EXPIRED" && order.status_pembayaran !== "CANCELLED") {
        // Kembalikan stok produk jika pembayaran gagal/expired
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

        const failStatus = transactionStatus === "expire" ? "EXPIRED" : "CANCELLED";
        await client.query(
          `UPDATE orders
           SET status_pembayaran = $1,
               status_pesanan = 'DIBATALKAN',
               payment_type = $2,
               midtrans_transaction_id = $3
           WHERE id = $4`,
          [failStatus, paymentType || null, transactionId || null, orderId]
        );
        console.log(`❌ Payment ${failStatus} for Order ${orderId}. Stock restored.`);
      }
    }

    await client.query("COMMIT");
    return { success: true, orderId, status: isPaid ? "PAID" : isFailed ? "FAILED" : "PENDING" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Simulasi Pembayaran Sukses Instan (Untuk Pengujian Sandbox Lokal)
 */
export const simulatePaymentSuccessService = async (orderId: string) => {
  return await handleMidtransWebhookService({
    order_id: orderId,
    transaction_status: "settlement",
    payment_type: "qris",
    transaction_id: `SIMULATED-${Date.now()}`,
    status_code: "200",
    gross_amount: "0",
    signature_key: "",
  });
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

    // Batasan user biasa: hanya status ANTRI atau MENUNGGU_PEMBAYARAN
    if (normalizedRole !== "ADMIN") {
      if (order.status_pesanan !== "ANTRI" && order.status_pesanan !== "MENUNGGU_PEMBAYARAN") {
        throw new AppError("Order sedang diproses dan tidak bisa dibatalkan", 400);
      }

      if (order.status_pesanan === "ANTRI") {
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
      `UPDATE orders SET status_pesanan = 'DIBATALKAN', status_pembayaran = 'CANCELLED' WHERE id = $1`,
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
      AND status_pesanan IN ('MENUNGGU_PEMBAYARAN', 'ANTRI', 'DIPROSES', 'SELESAI')
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
      COALESCE(o.customer_name, u.username, 'Pelanggan') AS username,
      o.customer_name,
      o.order_type,
      o.table_number,
      o.customer_phone,
      o.total_price,
      o.status_pesanan,
      o.status_pembayaran,
      o.payment_type,
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
            'image', p.image,
            'estimasi_menit', COALESCE(p.estimasi_menit, 5)
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM orders o
    LEFT JOIN auth u ON o.auth_id = u.id
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

export const getGuestOrdersWithItemsService = async (orderIds: string[]) => {
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return [];
  }

  // Filter valid UUIDs
  const validIds = orderIds.filter((id) =>
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())
  );

  if (validIds.length === 0) return [];

  const query = `
    SELECT 
      o.id,
      o.auth_id,
      o.customer_name,
      o.order_type,
      o.table_number,
      o.total_price,
      o.status_pesanan,
      o.status_pembayaran,
      o.payment_type,
      o.snap_token,
      o.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'produk_id', oi.produk_id,
            'nama_produk', p.nama,
            'harga_barang', oi.harga_barang,
            'quantity', oi.quantity,
            'subtotal', oi.subtotal,
            'image', p.image,
            'queue_number', dq.queue_number,
            'estimasi_menit', COALESCE(p.estimasi_menit, 5)
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN produk p ON oi.produk_id = p.id
    LEFT JOIN daily_queue dq ON dq.order_id = o.id
    WHERE o.id = ANY($1::uuid[])
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  const result = await pool.query(query, [validIds]);
  return result.rows;
};

export const getMyOrdersActiveWithItemsService = async (userId: string) => {
  const query = `
    SELECT 
      o.id,
      o.auth_id,
      o.total_price,
      o.status_pesanan,
      o.status_pembayaran,
      o.payment_type,
      o.snap_token,
      o.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'produk_id', oi.produk_id,
            'nama_produk', p.nama,
            'harga_barang', oi.harga_barang,
            'quantity', oi.quantity,
            'queue_number', dq.queue_number,
            'image', p.image,
            'estimasi_menit', COALESCE(p.estimasi_menit, 5)
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN produk p ON oi.produk_id = p.id
    LEFT JOIN daily_queue dq ON dq.order_id = o.id
    WHERE o.auth_id = $1
      AND o.status_pesanan IN ('MENUNGGU_PEMBAYARAN', 'ANTRI', 'DIPROSES')
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
      o.status_pembayaran,
      o.payment_type,
      o.snap_token,
      o.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'produk_id', oi.produk_id,
            'nama_produk', p.nama,
            'harga_barang', oi.harga_barang,
            'quantity', oi.quantity,
            'image', p.image,
            'queue_number', dq.queue_number,
            'estimasi_menit', COALESCE(p.estimasi_menit, 5)
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

export interface XenditWebhookPayload {
  id?: string;
  external_id: string;
  user_id?: string;
  status: string; // 'PAID', 'SETTLED', 'EXPIRED'
  payment_method?: string;
  payment_channel?: string;
  paid_amount?: number;
  paid_at?: string;
}

export const handleXenditWebhookService = async (payload: XenditWebhookPayload) => {
  const { external_id, status, payment_method, payment_channel } = payload;

  if (!external_id) {
    throw new AppError("Invalid external_id in webhook payload", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (status === "PAID" || status === "SETTLED") {
      const orderRes = await client.query(
        "SELECT id, status_pesanan FROM orders WHERE id = $1 FOR UPDATE",
        [external_id]
      );

      if (orderRes.rowCount === 0) {
        throw new AppError("Order not found", 404);
      }

      await client.query(
        `UPDATE orders
         SET status_pembayaran = 'PAID',
             status_pesanan = 'ANTRI',
             payment_type = $1
         WHERE id = $2`,
        [`${payment_method || "QRIS"}_${payment_channel || "XENDIT"}`, external_id]
      );

      const queueCheck = await client.query(
        "SELECT id FROM daily_queue WHERE order_id = $1",
        [external_id]
      );

      if (queueCheck.rowCount === 0) {
        const queueRes = await client.query(
          "SELECT COALESCE(MAX(queue_number), 0) + 1 AS next_queue FROM daily_queue WHERE created_at::date = CURRENT_DATE"
        );
        const nextQueue = queueRes.rows[0].next_queue;

        await client.query(
          "INSERT INTO daily_queue (order_id, queue_number) VALUES ($1, $2)",
          [external_id, nextQueue]
        );
      }
    } else if (status === "EXPIRED") {
      await client.query(
        "UPDATE orders SET status_pembayaran = 'EXPIRED', status_pesanan = 'DIBATALKAN' WHERE id = $1",
        [external_id]
      );
    }

    await client.query("COMMIT");
    return { success: true, message: `Order ${external_id} updated to ${status}` };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

