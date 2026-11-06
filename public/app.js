let allProducts = [];
let activeCategory = 'All';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupFarmerForm();
});

// View Navigation Switcher
function switchTab(tab) {
    const browseBtn = document.getElementById('tabBrowseBtn');
    const farmerBtn = document.getElementById('tabFarmerBtn');
    const browseView = document.getElementById('browseView');
    const farmerView = document.getElementById('farmerView');

    if (tab === 'browse') {
        browseBtn.classList.add('active');
        farmerBtn.classList.remove('active');
        browseView.classList.add('active');
        farmerView.classList.remove('active');
        fetchProducts();
    } else {
        farmerBtn.classList.add('active');
        browseBtn.classList.remove('active');
        farmerView.classList.add('active');
        browseView.classList.remove('active');
    }
}

// Fetch all marketplace inventory
async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        allProducts = await res.json();
        
        document.getElementById('totalProductsCount').innerText = allProducts.length;
        renderProducts(allProducts);
    } catch (err) {
        showToast('Error connecting to database server', 'error');
        console.error('Fetch error:', err);
    }
}

// Filter products based on search input & category chip
function filterProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    
    const filtered = allProducts.filter(item => {
        const matchesCategory = (activeCategory === 'All') || 
            (item.category.toLowerCase() === activeCategory.toLowerCase());
        const matchesQuery = item.product_name.toLowerCase().includes(query) || 
            (item.description && item.description.toLowerCase().includes(query));
        
        return matchesCategory && matchesQuery;
    });

    renderProducts(filtered);
}

function setCategoryFilter(category, buttonEl) {
    activeCategory = category;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    buttonEl.classList.add('active');
    filterProducts();
}

// Render modern cards
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fa-solid fa-seedling" style="font-size: 40px; color: var(--text-dim); margin-bottom: 16px;"></i>
                <h3 style="color: #fff; font-size: 18px;">No produce found</h3>
                <p style="color: var(--text-muted); font-size: 14px;">Try searching for a different keyword or list new items in the Farmer Dashboard.</p>
            </div>
        `;
        return;
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';

        const stockRatio = Math.min(100, Math.max(10, (p.quantity / 150) * 100));
        let stockClass = 'in-stock';
        let stockStatusText = `${p.quantity} in stock`;

        if (p.quantity === 0) {
            stockClass = 'out-stock';
            stockStatusText = 'Sold Out';
        } else if (p.quantity < 15) {
            stockClass = 'low-stock';
            stockStatusText = `Only ${p.quantity} left`;
        }

        card.innerHTML = `
            <div>
                <div class="card-top">
                    <span class="card-category-tag">${p.category}</span>
                    <span class="stock-pill ${stockClass}">
                        <i class="fa-solid fa-circle" style="font-size: 6px;"></i> ${stockStatusText}
                    </span>
                </div>

                <h3 class="card-title">${p.product_name}</h3>
                <p class="card-desc">${p.description || 'Verified pure harvest. Sourced directly from local regional farm.'}</p>

                <div class="stock-meter">
                    <div class="meter-labels">
                        <span>Batch Availability</span>
                        <span>${p.quantity} units</span>
                    </div>
                    <div class="meter-bar">
                        <div class="meter-fill" style="width: ${p.quantity === 0 ? 0 : stockRatio}%;"></div>
                    </div>
                </div>
            </div>

            <div>
                <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 8px;">
                    <i class="fa-solid fa-user-check" style="color: var(--primary);"></i> Farmer: <strong>${p.farmer_name || 'Sami'}</strong>
                </div>

                <div class="card-footer">
                    <div class="price-container">
                        <span class="price-sub">Wholesale Rate</span>
                        <span class="price-val">₹${parseFloat(p.price).toFixed(2)}</span>
                    </div>

                    <div class="action-form">
                        <input type="number" id="qty-${p.product_id}" class="qty-stepper" min="1" max="${p.quantity}" value="1" ${p.quantity === 0 ? 'disabled' : ''}>
                        <button class="buy-btn" onclick="placeDirectOrder(${p.product_id}, ${p.price})" ${p.quantity === 0 ? 'disabled' : ''}>
                            <i class="fa-solid fa-cart-shopping"></i> Order
                        </button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Setup Farmer Submission Form
function setupFarmerForm() {
    const form = document.getElementById('productForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            farmer_id: parseInt(document.getElementById('farmerId').value),
            product_name: document.getElementById('productName').value.trim(),
            category: document.getElementById('category').value,
            price: parseFloat(document.getElementById('price').value),
            quantity: parseInt(document.getElementById('quantity').value),
            description: document.getElementById('description').value.trim()
        };

        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                showToast(`✓ Listing Published! Product ID #${data.productId}`, 'success');
                form.reset();
                document.getElementById('farmerId').value = 1; // restore default
                switchTab('browse');
            } else {
                showToast(`Failed: ${data.error}`, 'error');
            }
        } catch (err) {
            showToast('Network error listing product', 'error');
        }
    });
}

// Place Order
async function placeDirectOrder(productId, price) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(qtyInput.value);

    if (!quantity || quantity <= 0) {
        showToast('Please specify a valid quantity', 'error');
        return;
    }

    const payload = {
        customer_id: 2, // Customer from users table
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
            showToast(`🎉 Order Placed! ID #${data.orderId}. Stock updated.`, 'success');
            fetchProducts();
        } else {
            showToast(`Order failed: ${data.error}`, 'error');
        }
    } catch (err) {
        showToast('Server communication error', 'error');
    }
}

// Toast helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3800);
}