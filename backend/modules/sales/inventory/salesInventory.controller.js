import { db } from "../../../config/db.js";

// GET all inventory items (with optional search / category filter)
export const getAllInventory = async (req, res) => {
  try {
    const { search, category } = req.query;

    let sql = "SELECT * FROM sales_inventory WHERE created_by = ?";
    const params = [req.salesUser?.employeeId];
    if (search) {
      sql += " AND item_name LIKE ?";
      params.push(`%${search}%`);
    }
    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }

    sql += " ORDER BY createdAt DESC";

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("getAllInventory error:", err);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
};

// GET summary stats (total items, total stock value, low stock count, categories)
export const getInventoryStats = async (req, res) => {
  try {
    const [[stats]] = await db.query(
      `SELECT
        COUNT(*) AS total_items,
        COALESCE(SUM(quantity * price), 0) AS total_value,
        COALESCE(SUM(quantity), 0) AS total_units,
        SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS low_stock_count
       FROM sales_inventory
       WHERE created_by = ?`,
      [req.salesUser?.employeeId],
    );

    const [categories] = await db.query(
      "SELECT DISTINCT category FROM sales_inventory WHERE created_by = ? AND category IS NOT NULL AND category != ''",
      [req.salesUser?.employeeId],
    );

    res.json({
      ...stats,
      categories: categories.map((c) => c.category),
    });
  } catch (err) {
    console.error("getInventoryStats error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

// POST create item
export const createInventoryItem = async (req, res) => {
  try {
    const {
      item_name,
      category,
      quantity,
      price,
      mrp,
      discount_price,
      gst_percent,
      low_stock_threshold,
    } = req.body;

    if (!item_name || String(item_name).trim() === "") {
      return res.status(400).json({ message: "Item name is required" });
    }

    const qty = Number.parseInt(quantity, 10);
    const prc = Number.parseFloat(price);
    if (Number.isNaN(qty) || qty < 0) {
      return res.status(400).json({ message: "Quantity must be 0 or more" });
    }
    if (Number.isNaN(prc) || prc < 0) {
      return res.status(400).json({ message: "Price must be 0 or more" });
    }

    const [result] = await db.query(
      `INSERT INTO sales_inventory
        (item_name, category, quantity, price, mrp, discount_price, gst_percent, low_stock_threshold, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        String(item_name).trim(),
        category || null,
        qty,
        prc,
        mrp !== undefined && mrp !== "" ? Number.parseFloat(mrp) : 0,
        discount_price !== undefined && discount_price !== ""
          ? Number.parseFloat(discount_price)
          : 0,
        gst_percent !== undefined && gst_percent !== ""
          ? Number.parseFloat(gst_percent)
          : 0,
        low_stock_threshold !== undefined && low_stock_threshold !== ""
          ? Number.parseInt(low_stock_threshold, 10)
          : 5,
        req.salesUser?.employeeId || null,
      ],
    );

    res.status(201).json({ id: result.insertId, message: "Item added" });
  } catch (err) {
    console.error("createInventoryItem error:", err);
    res.status(500).json({ message: "Failed to add item" });
  }
};

// PUT update item
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_name,
      category,
      quantity,
      price,
      mrp,
      discount_price,
      gst_percent,
      low_stock_threshold,
    } = req.body;

    if (!item_name || String(item_name).trim() === "") {
      return res.status(400).json({ message: "Item name is required" });
    }

    const [result] = await db.query(
      `UPDATE sales_inventory SET
        item_name = ?, category = ?, quantity = ?, price = ?,
        mrp = ?, discount_price = ?, gst_percent = ?, low_stock_threshold = ?
       WHERE id = ? AND created_by = ?`,
      [
        String(item_name).trim(),
        category || null,
        Number.parseInt(quantity, 10) || 0,
        Number.parseFloat(price) || 0,
        Number.parseFloat(mrp) || 0,
        Number.parseFloat(discount_price) || 0,
        Number.parseFloat(gst_percent) || 0,
        Number.parseInt(low_stock_threshold, 10) || 5,
        id,
        req.salesUser?.employeeId,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item updated" });
  } catch (err) {
    console.error("updateInventoryItem error:", err);
    res.status(500).json({ message: "Failed to update item" });
  }
};

// PATCH quick stock adjustment (+/- delta)
export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const delta = Number.parseInt(req.body.delta, 10);

    if (Number.isNaN(delta) || delta === 0) {
      return res.status(400).json({ message: "delta must be a non-zero integer" });
    }

    const [result] = await db.query(
      "UPDATE sales_inventory SET quantity = GREATEST(quantity + ?, 0) WHERE id = ? AND created_by = ?",
      [delta, id, req.salesUser?.employeeId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    const [[row]] = await db.query(
      "SELECT quantity FROM sales_inventory WHERE id = ? AND created_by = ?",
      [id, req.salesUser?.employeeId],
    );

    res.json({ message: "Stock updated", quantity: row.quantity });
  } catch (err) {
    console.error("adjustStock error:", err);
    res.status(500).json({ message: "Failed to update stock" });
  }
};

// DELETE item
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM sales_inventory WHERE id = ? AND created_by = ?",
      [id, req.salesUser?.employeeId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("deleteInventoryItem error:", err);
    res.status(500).json({ message: "Failed to delete item" });
  }
};
