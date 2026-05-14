document.addEventListener('DOMContentLoaded', function () {

    const listingsGrid    = document.getElementById('listings-grid');
    const leaderboardEl   = document.getElementById('leaderboard-list');
    const searchForm      = document.getElementById('search-form');
    const searchInput     = document.getElementById('search-input');
    const sortSelect      = document.getElementById('sort-select');
    const titleEl         = document.getElementById('listings-title');
    const subtitleEl      = document.getElementById('listings-subtitle');

    let allItems = [];
    let dealIds = new Set();
    let currentSearch = '';
    let currentSort = 'newest';


    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


    async function loadEverything() {
        const [items, deals] = await Promise.all([
            window.tempest.fetchAvailableItems(),
            window.tempest.fetchDailyDealIds()
        ]);
        allItems = items;
        dealIds = deals;
        renderListings();
    }


    function renderListings() {
        let items = allItems.slice();

        if (currentSearch !== '') {
            const q = currentSearch.toLowerCase();
            items = items.filter(item =>
                item.name.toLowerCase().includes(q) ||
                (item.description && item.description.toLowerCase().includes(q)) ||
                (item.category && item.category.toLowerCase().includes(q))
            );
        }

        switch (currentSort) {
            case 'price-asc':
                items.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                items.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                items.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'newest':
            default:
                items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }

        if (currentSearch !== '') {
            titleEl.textContent = `Search Results`;
            subtitleEl.textContent = `${items.length} item${items.length === 1 ? '' : 's'} matching "${currentSearch}"`;
        } else {
            titleEl.textContent = 'Featured Listings';
            subtitleEl.textContent = "See what's trending!";
        }

        if (items.length === 0) {
            const message = currentSearch !== ''
                ? `No items match "${escapeHtml(currentSearch)}". Try a different search.`
                : 'No listings available right now.';
            listingsGrid.innerHTML = `<p class="listings-loading">${message}</p>`;
            return;
        }

        const html = items.map(item => {
            const onDeal = dealIds.has(item.id);
            const discountedPrice = onDeal ? Math.floor(item.price * 0.75) : item.price;

            const priceHtml = onDeal
                ? `<p class="listing-price">
                       <span class="price-original">؏${item.price.toLocaleString()}</span>
                       <span class="price-deal">؏${discountedPrice.toLocaleString()}</span>
                   </p>
                   <span class="deal-tag">25% OFF TODAY</span>`
                : `<p class="listing-price">؏${item.price.toLocaleString()}</p>`;

            return `
                <div class="listing ${onDeal ? 'listing-on-deal' : ''}">
                    <div class="listing-image">
                        <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
                    </div>
                    <div class="listing-info">
                        <h3 class="listing-name">${escapeHtml(item.name)}</h3>
                        ${priceHtml}
                        <button class="add-cart-btn" data-item-id="${item.id}">Add to Cart</button>
                    </div>
                </div>
            `;
        }).join('');

        listingsGrid.innerHTML = html;

        listingsGrid.querySelectorAll('.add-cart-btn').forEach(btn => {
            btn.addEventListener('click', handleAddToCart);
        });
    }


    searchForm.addEventListener('submit', function (event) {
        event.preventDefault();
        currentSearch = searchInput.value.trim();
        renderListings();
    });

    let searchTimer = null;
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentSearch = searchInput.value.trim();
            renderListings();
        }, 200);
    });


    sortSelect.addEventListener('change', function () {
        currentSort = sortSelect.value;
        renderListings();
    });


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

    async function loadLeaderboard() {
        const data = await window.tempest.fetchTopSquallers(10);

        if (!data || data.length === 0) {
            leaderboardEl.innerHTML = '<li class="leaderboard-loading">No squallers yet. Be the first!</li>';
            return;
        }

        const html = data.map((user, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            const safeUsername = escapeHtml(user.username);
            return `
                <li class="${rankClass}">
                    <span class="rank-num">${rank}.</span>
                    <a href="profile.html?username=${encodeURIComponent(user.username)}" class="rank-name-link">
                        <span class="rank-name">${safeUsername}</span>
                    </a>
                    <span class="rank-dots"></span>
                    <span class="rank-worth">؏${Number(user.squalls).toLocaleString()}</span>
                </li>
            `;
        }).join('');

        leaderboardEl.innerHTML = html;
    }


    loadEverything();
    loadLeaderboard();

    window.addEventListener('tempest:auth-changed', function () {
        loadLeaderboard();
        loadEverything();
    });

});
