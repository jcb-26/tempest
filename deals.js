document.addEventListener('DOMContentLoaded', function () {

    const dealsGrid     = document.getElementById('deals-grid');
    const dealsDate     = document.getElementById('deals-date');
    const dealsCountdown = document.getElementById('deals-countdown');


    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


    function showDateAndCountdown() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        dealsDate.textContent = '— ' + dateStr;

        const tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);
        const msLeft = tomorrow - now;
        const hours = Math.floor(msLeft / (1000 * 60 * 60));
        const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

        dealsCountdown.textContent = `New deals in ${hours}h ${minutes}m`;
    }


    async function loadDeals() {
        const deals = await window.tempest.fetchDailyDeals();

        if (!deals || deals.length === 0) {
            dealsGrid.innerHTML = '<p class="listings-loading">No deals available right now. Check back tomorrow!</p>';
            return;
        }

        const html = deals.map(item => `
            <div class="listing listing-on-deal">
                <div class="listing-image">
                    <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
                </div>
                <div class="listing-info">
                    <h3 class="listing-name">${escapeHtml(item.name)}</h3>
                    <p class="listing-price">
                        <span class="price-original">؏${item.price.toLocaleString()}</span>
                        <span class="price-deal">؏${item.discounted_price.toLocaleString()}</span>
                    </p>
                    <span class="deal-tag">25% OFF TODAY</span>
                    <button class="add-cart-btn" data-item-id="${item.id}">Add to Cart</button>
                </div>
            </div>
        `).join('');

        dealsGrid.innerHTML = html;

        dealsGrid.querySelectorAll('.add-cart-btn').forEach(btn => {
            btn.addEventListener('click', handleAddToCart);
        });
    }


    async function handleAddToCart(event) {
        event.preventDefault();
        event.stopPropagation();

        const btn = event.currentTarget;
        const itemId = btn.dataset.itemId;

        const profile = await window.tempest.getCurrentProfile();
        if (!profile) {
            window.tempestAuth.openSigninModal();
            return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Adding...';

        const result = await window.tempest.addToCart(itemId);

        if (result.success) {
            btn.textContent = 'Added! ✓';
            btn.classList.add('added');
            window.tempestAuth.refreshAuthUI();
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('added');
                btn.disabled = false;
            }, 1500);
        } else {
            btn.textContent = result.error.includes('already') ? 'Already in cart' : 'Error';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 1800);
        }
    }
    
    showDateAndCountdown();
    loadDeals();
    setInterval(showDateAndCountdown, 60 * 1000);

});
