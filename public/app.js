const productGrid = document.getElementById('productGrid');
const productForm = document.getElementById('productForm');

document.addEventListener('DOMContentLoaded', fetchProducts);

async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        
        productGrid.innerHTML = '';
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <h3>${p.product_name}</h3>
                <span class="badge">${p.category}</span>
                <p>${p.description || 'No description'}</p>
                <div class="price">₹${parseFloat(p.price).toFixed(2)}</div>
                <p><strong>Stock:</strong> ${p.quantity} units</p>
                <p><small>Farmer: ${p.farmer_name || 'Farmer ID ' + p.farmer_id}</small></p>
                
                <div class="order-box">
                    <input type="number" id="qty-${p.product_id}" min="1" max="${p.quantity}" value="1">
                    <button class="order-btn" onclick="placeOrder(${p.product_id}, ${p.price})">Order</button>
                </div>
            `;
            productGrid.appendChild(card);
        });
    } catch (err) {
        console.error('Error fetching inventory:', err);
    }
}

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        farmer_id: parseInt(document.getElementById('farmerId').value),
        product_name: document.getElementById('productName').value,
        category: document.getElementById('category').value,
        price: parseFloat(document.getElementById('price').value),
        quantity: parseInt(document.getElementById('quantity').value),
        description: document.getElementById('description').value
    };

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Product listed successfully!');
            productForm.reset();
            fetchProducts();
        } else {
            const err = await res.json();
            alert('Failed: ' + err.error);
        }
    } catch (err) {
        console.error('Error listing product:', err);
    }
});

async function placeOrder(productId, price) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(qtyInput.value);

    if (!quantity || quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
    }

    const payload = {
        customer_id: 2,
        product_id: productId,
        quantity: quantity,
        price: price
    };

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            alert('Order placed successfully! Order ID: ' + data.orderId);
            fetchProducts();
        } else {
            alert('Order failed: ' + data.error);
        }
    } catch (err) {
        console.error('Error placing order:', err);
    }
}