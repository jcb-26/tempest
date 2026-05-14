document.addEventListener('DOMContentLoaded', function () {

    const pageTitleEl   = document.getElementById('cart-page-title');
    const subtitleEl    = document.getElementById('cart-subtitle');

    const signedOutEl   = document.getElementById('cart-signed-out');
    const emptyEl       = document.getElementById('cart-empty');
    const cartLayoutEl  = document.getElementById('cart-layout');
    const cartItemsEl   = document.getElementById('cart-items');

    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryCount    = document.getElementById('summary-count');
    const summaryBalance  = document.getElementById('summary-balance');
    const summaryAfter    = document.getElementById('summary-after');

    const checkoutBtn     = document.getElementById('checkout-btn');
    const checkoutError   = document.getElementById('checkout-error');

    const cartSigninBtn   = document.getElementById('cart-signin-btn');

    // Receipt elements
    const receiptWrapper  = document.getElementById('receipt-wrapper');
    const receiptDate     = document.getElementById('receipt-date');
    const receiptItemsEl  = document.getElementById('receipt-items');
    const receiptCount    = document.getElementById('receipt-count');
    const receiptSubtotal = document.getElementById('receipt-subtotal');
    const receiptSavings  = document.getElementById('receipt-savings');
    const receiptSavingsRow = document.getElementById('receipt-savings-row');
    const receiptTotal    = document.getElementById('receipt-total');
    const receiptBalance  = document.getElementById('receipt-balance');
    const receiptFailures = document.getElementById('receipt-failures');



    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showError(el, msg) {
        el.textContent = msg;
        el.classList.add('is-visible');
    }

    function clearMessages() {
        checkoutError.textContent = '';
        checkoutError.classList.remove('is-visible');
    }



    function hideAllSections() {
        signedOutEl.style.display = 'none';
        emptyEl.style.display = 'none';
        cartLayoutEl.style.display = 'none';
        receiptWrapper.style.display = 'none';
    }

    function showSignedOut() {
        hideAllSections();
        signedOutEl.style.display = 'block';
        subtitleEl.style.display = 'none';
        pageTitleEl.textContent = 'My Cart';
    }

    function showEmpty() {
        hideAllSections();
        emptyEl.style.display = 'block';
        subtitleEl.style.display = 'none';
        pageTitleEl.textContent = 'My Cart';
    }

    function showCart() {
        hideAllSections();
        cartLayoutEl.style.display = 'grid';
        subtitleEl.style.display = 'block';
        subtitleEl.textContent = 'Review your items and check out when ready.';
        pageTitleEl.textContent = 'My Cart';
    }

    function showReceiptView() {
        hideAllSections();
        receiptWrapper.style.display = 'block';
        subtitleEl.style.display = 'block';
        subtitleEl.textContent = 'Thanks for your purchase. Here\'s your receipt.';
        pageTitleEl.textContent = 'Order Confirmation';
    }


    async function loadCart() {
        clearMessages();

        const profile = await window.tempest.getCurrentProfile();
        if (!profile) {
            showSignedOut();
            return;
        }

        const cartRows = await window.tempest.fetchCart();

        if (cartRows.length === 0) {
            showEmpty();
            return;
        }

        showCart();

        const html = cartRows.map(row => {
            const item = row.item;
            const unavailable = !item.is_for_sale;
            return `
                <div class="cart-row ${unavailable ? 'cart-row-unavailable' : ''}">
                    <div class="cart-row-image">
                        <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
                    </div>
                    <div class="cart-row-info">
                        <h3>${escapeHtml(item.name)}</h3>
                        <p class="cart-row-desc">${escapeHtml(item.description || '')}</p>
                        ${unavailable ? '<p class="cart-row-warning">No longer available</p>' : ''}
                    </div>
                    <div class="cart-row-price">
                        <p class="listing-price">؏${item.price.toLocaleString()}</p>
                        <button class="cart-remove-btn" data-item-id="${item.id}">Remove</button>
                    </div>
                </div>
            `;
        }).join('');

        cartItemsEl.innerHTML = html;

        cartItemsEl.querySelectorAll('.cart-remove-btn').forEach(btn => {
            btn.addEventListener('click', handleRemove);
        });

        const availableItems = cartRows.filter(r => r.item.is_for_sale);
        const subtotal = availableItems.reduce((sum, r) => sum + r.item.price, 0);
        const balance = profile.squalls;
        const after = balance - subtotal;

        summarySubtotal.textContent = '؏' + subtotal.toLocaleString();
        summaryCount.textContent = availableItems.length;
        summaryBalance.textContent = '؏' + balance.toLocaleString();
        summaryAfter.textContent = '؏' + after.toLocaleString();

        if (after < 0) {
            summaryAfter.style.color = 'var(--color-price)';
        } else {
            summaryAfter.style.color = '';
        }

        if (availableItems.length === 0) {
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = 'Nothing to buy';
        } else if (after < 0) {
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = 'Not enough squalls';
        } else {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = `Buy ${availableItems.length} item${availableItems.length === 1 ? '' : 's'}`;
        }
    }



    async function handleRemove(event) {
        const btn = event.currentTarget;
        const itemId = btn.dataset.itemId;

        btn.disabled = true;
        btn.textContent = 'Removing...';

        const result = await window.tempest.removeFromCart(itemId);

        if (result.success) {
            await loadCart();
            window.tempestAuth.refreshAuthUI();
        } else {
            btn.textContent = 'Error';
            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = 'Remove';
            }, 1500);
        }
    }



    checkoutBtn.addEventListener('click', async function () {
        clearMessages();

        const cartRows = await window.tempest.fetchCart();
        const availableItems = cartRows.filter(r => r.item.is_for_sale);

        if (availableItems.length === 0) {
            return showError(checkoutError, 'Nothing in your cart to buy.');
        }

        checkoutBtn.disabled = true;
        const originalText = checkoutBtn.textContent;
        checkoutBtn.textContent = 'Purchasing...';

        const purchased = [];
        const failures = [];
        let finalBalance = null;

        for (const row of availableItems) {
            const result = await window.tempest.purchaseItem(row.item.id);
            if (result && result.success) {
                purchased.push({
                    name: result.item_name,
                    price: result.price,
                    on_deal: result.on_deal,
                    original_price: row.item.price,
                    image_url: row.item.image_url
                });
                finalBalance = result.remaining_squalls;
            } else {
                failures.push({
                    name: row.item.name,
                    error: (result && result.error) || 'Unknown error'
                });
            }
        }

        checkoutBtn.disabled = false;
        checkoutBtn.textContent = originalText;

        if (purchased.length > 0) {
            renderReceipt(purchased, finalBalance, failures);
            showReceiptView();
            window.tempestAuth.refreshAuthUI();
        } else {
            // Everything failed
            const errMsg = failures.length > 0 ? failures[0].error : 'Purchase failed.';
            showError(checkoutError, errMsg);
            await loadCart();
        }
    });


    function renderReceipt(items, newBalance, failures) {
        // Date
        const now = new Date();
        receiptDate.textContent = now.toLocaleString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });

        // Items
        const html = items.map(item => {
            const wasOnDeal = item.on_deal && item.original_price !== item.price;
            const priceHtml = wasOnDeal
                ? `<span class="price-original">؏${item.original_price.toLocaleString()}</span><span class="price-paid">؏${item.price.toLocaleString()}</span>`
                : `<span class="price-paid">؏${item.price.toLocaleString()}</span>`;
            const dealTag = wasOnDeal
                ? `<span class="receipt-deal-tag">DEAL</span>`
                : '';

            return `
                <div class="receipt-row">
                    <div class="receipt-row-image">
                        <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
                    </div>
                    <div class="receipt-row-info">
                        <div class="receipt-row-name">${escapeHtml(item.name)} ${dealTag}</div>
                    </div>
                    <div class="receipt-row-price">${priceHtml}</div>
                </div>
            `;
        }).join('');

        receiptItemsEl.innerHTML = html;

        const totalPaid = items.reduce((sum, i) => sum + i.price, 0);
        const totalListed = items.reduce((sum, i) => sum + i.original_price, 0);
        const savings = totalListed - totalPaid;

        receiptCount.textContent = items.length;
        receiptSubtotal.textContent = '؏' + totalListed.toLocaleString();
        receiptTotal.textContent = '؏' + totalPaid.toLocaleString();
        receiptBalance.textContent = '؏' + Number(newBalance).toLocaleString();

        if (savings > 0) {
            receiptSavings.textContent = '−؏' + savings.toLocaleString();
            receiptSavingsRow.style.display = 'flex';
        } else {
            receiptSavingsRow.style.display = 'none';
        }

        if (failures && failures.length > 0) {
            const names = failures.map(f => escapeHtml(f.name)).join(', ');
            receiptFailures.textContent = `Couldn't purchase: ${names}`;
            receiptFailures.classList.add('is-visible');
            receiptFailures.style.display = 'block';
        } else {
            receiptFailures.style.display = 'none';
        }
    }



    if (cartSigninBtn) {
        cartSigninBtn.addEventListener('click', function () {
            window.tempestAuth.openSigninModal();
        });
    }



    loadCart();

    window.addEventListener('tempest:auth-changed', function () {
        loadCart();
    });

});
