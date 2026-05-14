document.addEventListener('DOMContentLoaded', function () {

    const tradesList = document.getElementById('trades-list');


    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


    function timeAgo(dateString) {
        const now = new Date();
        const then = new Date(dateString);
        const diffMs = now - then;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
        if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
        if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
        return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function profileLink(username, label) {
        return `<a href="profile.html?username=${encodeURIComponent(username)}" class="username-link">${escapeHtml(label || username)}</a>`;
    }


    async function loadTrades() {
        const trades = await window.tempest.fetchRecentTransactions(50);

        if (!trades || trades.length === 0) {
            tradesList.innerHTML = '<p class="listings-loading">No trades have happened yet. Be the first!</p>';
            return;
        }

        const html = trades.map(trade => {
            const sellerName = trade.seller_username || 'Tempest';
            const isFromSystem = !trade.seller_username;

            const buyerHtml = trade.buyer_username
                ? profileLink(trade.buyer_username)
                : '<span>Unknown</span>';

            const sellerHtml = isFromSystem
                ? '<span class="trade-seller-system">Tempest</span>'
                : profileLink(trade.seller_username);

            return `
                <div class="trade-row">
                    <div class="trade-image">
                        <img src="${escapeHtml(trade.item_image_url)}" alt="${escapeHtml(trade.item_name)}">
                    </div>
                    <div class="trade-info">
                        <div class="trade-headline">
                            <span class="trade-buyer">${buyerHtml}</span>
                            <span class="trade-arrow">←</span>
                            <span class="trade-item">${escapeHtml(trade.item_name)}</span>
                        </div>
                        <div class="trade-meta">
                            from <span class="trade-seller">${sellerHtml}</span>
                            <span class="trade-dot">•</span>
                            <span class="trade-time">${timeAgo(trade.purchased_at)}</span>
                        </div>
                    </div>
                    <div class="trade-price">؏${trade.price.toLocaleString()}</div>
                </div>
            `;
        }).join('');

        tradesList.innerHTML = html;
    }
    loadTrades();
    setInterval(loadTrades, 30 * 1000);

});
