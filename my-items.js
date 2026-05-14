document.addEventListener('DOMContentLoaded', function () {

    const signedOutEl  = document.getElementById('signed-out');
    const emptyEl      = document.getElementById('empty-state');
    const layoutEl     = document.getElementById('items-layout');
    const subtitleEl   = document.getElementById('page-subtitle');
    const statsEl      = document.getElementById('items-stats');
    const itemsGrid    = document.getElementById('my-items-grid');
    const historyList  = document.getElementById('history-list');
    const pageSigninBtn = document.getElementById('page-signin-btn');

    const tabButtons   = document.querySelectorAll('.my-items-tab');

    const relistModal  = document.getElementById('relist-modal');
    const relistForm   = document.getElementById('relist-form');
    const relistTitle  = document.getElementById('relist-title');
    const relistName   = document.getElementById('relist-item-name');
    const relistPrice  = document.getElementById('relist-price');
    const relistError  = document.getElementById('relist-error');
    const relistOk     = document.getElementById('relist-success');

    let currentItems = [];
    let currentFilter = 'all';
    let relistingItemId = null;


    // ============== HELPERS ==============

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

    function showSuccess(el, msg) {
        el.textContent = msg;
        el.classList.add('is-visible');
    }

    function clearMessages() {
        [relistError, relistOk].forEach(el => {
            el.textContent = '';
            el.classList.remove('is-visible');
        });
    }

    function showSignedOut() {
        signedOutEl.style.display = 'block';
        emptyEl.style.display = 'none';
        layoutEl.style.display = 'none';
        subtitleEl.style.display = 'none';
    }

    function showEmpty() {
        signedOutEl.style.display = 'none';
        emptyEl.style.display = 'block';
        layoutEl.style.display = 'none';
        subtitleEl.style.display = 'none';
    }

    function showItems() {
        signedOutEl.style.display = 'none';
        emptyEl.style.display = 'none';
        layoutEl.style.display = 'block';
        subtitleEl.style.display = 'block';
    }

    async function loadMyItems() {
        const profile = await window.tempest.getCurrentProfile();
        if (!profile) {
            showSignedOut();
            return;
        }

        currentItems = await window.tempest.fetchMyItems();

        if (currentItems.length === 0) {
            showEmpty();
            return;
        }

        showItems();
        renderStats(profile);
        renderItems();
        loadHistory();
    }

    function renderStats(profile) {
        const totalItems = currentItems.length;
        const listedCount = currentItems.filter(i => i.is_for_sale).length;
        const totalValue = currentItems.reduce((sum, i) => sum + i.price, 0);
        const netWorth = profile.squalls + totalValue;

        statsEl.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Items Owned</div>
                <div class="stat-value">${totalItems}</div>
                <div class="stat-sub">${listedCount} listed for sale</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Wallet Balance</div>
                <div class="stat-value stat-value-money">؏${profile.squalls.toLocaleString()}</div>
                <div class="stat-sub">Available squalls</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Item Holdings</div>
                <div class="stat-value stat-value-money">؏${totalValue.toLocaleString()}</div>
                <div class="stat-sub">Combined item value</div>
            </div>
            <div class="stat-card stat-card-highlight">
                <div class="stat-label">Net Worth</div>
                <div class="stat-value stat-value-money">؏${netWorth.toLocaleString()}</div>
                <div class="stat-sub">Cash + items</div>
            </div>
        `;
    }

    function renderItems() {
        let itemsToShow;
        if (currentFilter === 'listed') {
            itemsToShow = currentItems.filter(i => i.is_for_sale);
        } else if (currentFilter === 'unlisted') {
            itemsToShow = currentItems.filter(i => !i.is_for_sale);
        } else {
            itemsToShow = currentItems;
        }

        if (itemsToShow.length === 0) {
            itemsGrid.innerHTML = '<p class="listings-loading">No items in this category.</p>';
            return;
        }

        const html = itemsToShow.map(item => {
            const statusBadge = item.is_for_sale
                ? `<span class="item-status status-listed">Listed: ؏${item.price.toLocaleString()}</span>`
                : `<span class="item-status status-unlisted">Not Listed</span>`;

            const actionBtn = item.is_for_sale
                ? `<button class="add-cart-btn delist-btn" data-item-id="${item.id}">Delist</button>`
                : `<button class="add-cart-btn relist-btn" data-item-id="${item.id}" data-item-name="${escapeHtml(item.name)}">List for Sale</button>`;

            return `
                <div class="listing">
                    <div class="listing-image">
                        <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
                    </div>
                    <div class="listing-info">
                        <h3 class="listing-name">${escapeHtml(item.name)}</h3>
                        ${statusBadge}
                        ${actionBtn}
                    </div>
                </div>
            `;
        }).join('');

        itemsGrid.innerHTML = html;

        // Wire up buttons
        itemsGrid.querySelectorAll('.relist-btn').forEach(btn => {
            btn.addEventListener('click', handleRelistClick);
        });
        itemsGrid.querySelectorAll('.delist-btn').forEach(btn => {
            btn.addEventListener('click', handleDelistClick);
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            tabButtons.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            currentFilter = btn.dataset.tab;
            renderItems();
        });
    });

    function handleRelistClick(event) {
        const btn = event.currentTarget;
        relistingItemId = btn.dataset.itemId;
        const itemName = btn.dataset.itemName;

        clearMessages();
        relistName.textContent = itemName;
        relistPrice.value = '';
        relistTitle.textContent = 'List for Sale';

        // Open the relist modal
        document.querySelectorAll('.modal-overlay.is-open').forEach(m => m.classList.remove('is-open'));
        relistModal.classList.add('is-open');
        relistPrice.focus();
    }

    relistForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearMessages();

        const price = parseInt(relistPrice.value, 10);

        if (isNaN(price) || price < 1) {
            return showError(relistError, 'Please enter a price of at least ؏1.');
        }
        if (price > 1000000) {
            return showError(relistError, 'Price cannot exceed ؏1,000,000.');
        }

        const result = await window.tempest.relistItem(relistingItemId, price);

        if (!result.success) {
            return showError(relistError, result.error || 'Could not list item.');
        }

        showSuccess(relistOk, `${result.item_name} is now listed for ؏${result.new_price.toLocaleString()}.`);
        setTimeout(async () => {
            relistModal.classList.remove('is-open');
            await loadMyItems();
        }, 1200);
    });

    async function handleDelistClick(event) {
        const btn = event.currentTarget;
        const itemId = btn.dataset.itemId;

        if (!confirm('Take this item off the market? You can re-list it anytime.')) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Removing...';

        const result = await window.tempest.delistItem(itemId);

        if (result.success) {
            await loadMyItems();
        } else {
            btn.textContent = 'Error';
            alert(result.error || 'Could not delist item.');
            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = 'Delist';
            }, 1500);
        }
    }

    async function loadHistory() {
        const transactions = await window.tempest.fetchMyTransactions();

        if (transactions.length === 0) {
            historyList.innerHTML = '<p class="history-empty">No purchases yet.</p>';
            return;
        }

        const html = transactions.map(tx => {
            const date = new Date(tx.purchased_at);
            const dateStr = date.toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const timeStr = date.toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit'
            });
            return `
                <div class="history-row">
                    <div class="history-date">
                        <div class="history-date-day">${dateStr}</div>
                        <div class="history-date-time">${timeStr}</div>
                    </div>
                    <div class="history-info">
                        <div class="history-name">${escapeHtml(tx.item_name)}</div>
                    </div>
                    <div class="history-price">؏${tx.price.toLocaleString()}</div>
                </div>
            `;
        }).join('');

        historyList.innerHTML = html;
    }

    if (pageSigninBtn) {
        pageSigninBtn.addEventListener('click', function () {
            window.tempestAuth.openSigninModal();
        });
    }

    loadMyItems();

    window.addEventListener('tempest:auth-changed', function () {
        loadMyItems();
    });

});
