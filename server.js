const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Fetch products
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, u.name AS farmer_name 
            FROM products p 
            JOIN users u ON p.farmer_id = u.user_id
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Add product (Farmer)
app.post('/api/products', async (req, res) => {
    const { farmer_id, product_name, category, price, quantity, description } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO products (farmer_id, product_name, category, price, quantity, description) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [farmer_id, product_name, category, price, quantity, description]
        );
        res.status(201).json({ message: 'Product listed successfully', productId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Place order (Customer)
app.post('/api/orders', async (req, res) => {
    const { customer_id, product_id, quantity, price } = req.body;
    try {
        const [stockCheck] = await db.query('SELECT quantity FROM products WHERE product_id = ?', [product_id]);
        if (stockCheck.length === 0 || stockCheck[0].quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient stock available' });
        }

        const [orderResult] = await db.query(
            'INSERT INTO orders (customer_id) VALUES (?)',
            [customer_id]
        );
        const orderId = orderResult.insertId;

        await db.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price) 
             VALUES (?, ?, ?, ?)`,
            [orderId, product_id, quantity, price]
        );

        await db.query(
            'UPDATE products SET quantity = quantity - ? WHERE product_id = ?',
            [quantity, product_id]
        );

        res.status(201).json({ message: 'Order placed successfully', orderId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});