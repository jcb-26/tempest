document.addEventListener('DOMContentLoaded', function () {

    const loadingEl    = document.getElementById('profile-loading');
    const notFoundEl   = document.getElementById('profile-not-found');
    const signedOutEl  = document.getElementById('profile-signed-out');
    const contentEl    = document.getElementById('profile-content');

    const usernameEl   = document.getElementById('profile-username');
    const followsYouTag = document.getElementById('follows-you-tag');
    const actionsEl    = document.getElementById('profile-actions');
    const followBtn    = document.getElementById('follow-btn');
    const profileSigninBtn = document.getElementById('profile-signin-btn');

    const statSqualls   = document.getElementById('stat-squalls');
    const statItemValue = document.getElementById('stat-item-value');
    const statItemCount = document.getElementById('stat-item-count');
    const statNetWorth  = document.getElementById('stat-net-worth');
    const statFollowers = document.getElementById('stat-followers');
    const statFollowing = document.getElementById('stat-following');

    const tabButtons    = document.querySelectorAll('.my-items-tab');
    const tabCountAll      = document.getElementById('tab-count-all');
    const tabCountListed   = document.getElementById('tab-count-listed');
    const tabCountUnlisted = document.getElementById('tab-count-unlisted');
    const itemsGrid     = document.getElementById('profile-items-grid');

    let profileData = null;
    let allItems = [];
    let currentFilter = 'all';
    let targetUsername = null;


    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showOnly(card) {
        [loadingEl, notFoundEl, signedOutEl, contentEl].forEach(el => {
            el.style.display = 'none';
        });
        card.style.display = 'block';
    }

    async function loadProfile() {
        // Determine which profile we're viewing
        const urlParams = new URLSearchParams(window.location.search);
        targetUsername = urlParams.get('username');

        // No username in URL
        if (!targetUsername) {
            const myProfile = await window.tempest.getCurrentProfile();
            if (!myProfile) {
                showOnly(signedOutEl);
                return;
            }
            targetUsername = myProfile.username;
        }

        showOnly(loadingEl);

        // get profiles data and items in parallel
        const [profile, items] = await Promise.all([
            window.tempest.fetchUserProfile(targetUsername),
            window.tempest.fetchUserItems(targetUsername)
        ]);

        if (!profile) {
            showOnly(notFoundEl);
            return;
        }

        profileData = profile;
        allItems = items || [];
        renderProfile();
        showOnly(contentEl);
    }


    function renderProfile() {
        document.title = `${profileData.username} - Tempest`;
        usernameEl.textContent = profileData.username;

        // "Follows you" tag
        if (profileData.is_following_viewer && !profileData.is_own_profile) {
            followsYouTag.style.display = 'inline-block';
        } else {
            followsYouTag.style.display = 'none';
        }

        // Stats
        statSqualls.textContent   = '؏' + Number(profileData.squalls).toLocaleString();
        statItemValue.textContent = '؏' + Number(profileData.item_value).toLocaleString();
        statItemCount.textContent = profileData.item_count;
        statNetWorth.textContent  = '؏' + Number(profileData.net_worth).toLocaleString();
        statFollowers.textContent = profileData.follower_count;
        statFollowing.textContent = profileData.following_count;

        if (profileData.is_own_profile) {
            actionsEl.style.display = 'none';
        } else {
            actionsEl.style.display = 'flex';
            renderFollowButton();
        }

        // Tab counts
        const listedCount = allItems.filter(i => i.is_for_sale).length;
        const unlistedCount = allItems.length - listedCount;
        tabCountAll.textContent      = allItems.length;
        tabCountListed.textContent   = listedCount;
        tabCountUnlisted.textContent = unlistedCount;

        renderItems();
    }


    function renderFollowButton() {
        if (profileData.viewer_is_following) {
            followBtn.textContent = 'Following';
            followBtn.classList.add('is-following');
        } else {
            followBtn.textContent = 'Follow';
            followBtn.classList.remove('is-following');
        }
        followBtn.disabled = false;
    }


    function renderItems() {
        let itemsToShow;
        if (currentFilter === 'listed') {
            itemsToShow = allItems.filter(i => i.is_for_sale);
        } else if (currentFilter === 'unlisted') {
            itemsToShow = allItems.filter(i => !i.is_for_sale);
        } else {
            itemsToShow = allItems;
        }

        if (itemsToShow.length === 0) {
            const message = currentFilter === 'all'
                ? 'No items owned yet.'
                : currentFilter === 'listed'
                    ? 'No items currently listed for sale.'
                    : 'All owned items are currently listed for sale.';
            itemsGrid.innerHTML = `<p class="listings-loading">${escapeHtml(message)}</p>`;
            return;
        }

        const html = itemsToShow.map(item => {
            const badge = item.is_for_sale
                ? `<span class="item-status status-listed">Listed: ؏${item.price.toLocaleString()}</span>`
                : `<span class="item-status status-unlisted">Not Listed</span>`;

            return `
                <div class="listing">
                    <div class="listing-image">
                        <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
                    </div>
                    <div class="listing-info">
                        <h3 class="listing-name">${escapeHtml(item.name)}</h3>
                        ${badge}
                    </div>
                </div>
            `;
        }).join('');

        itemsGrid.innerHTML = html;
    }



    tabButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            tabButtons.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            currentFilter = btn.dataset.tab;
            renderItems();
        });
    });


    followBtn.addEventListener('click', async function () {
        const myProfile = await window.tempest.getCurrentProfile();
        if (!myProfile) {
            window.tempestAuth.openSigninModal();
            return;
        }

        followBtn.disabled = true;
        const wasFollowing = profileData.viewer_is_following;
        followBtn.textContent = wasFollowing ? 'Unfollowing...' : 'Following...';

        const action = wasFollowing
            ? window.tempest.unfollowUser(targetUsername)
            : window.tempest.followUser(targetUsername);

        const result = await action;

        if (result.success) {
            profileData.viewer_is_following = !wasFollowing;
            profileData.follower_count = wasFollowing
                ? profileData.follower_count - 1
                : profileData.follower_count + 1;
            statFollowers.textContent = profileData.follower_count;
            renderFollowButton();
        } else {
            renderFollowButton();
            alert(result.error || 'Something went wrong.');
        }
    });

    if (profileSigninBtn) {
        profileSigninBtn.addEventListener('click', function () {
            window.tempestAuth.openSigninModal();
        });
    }

    loadProfile();

    window.addEventListener('tempest:auth-changed', function () {
        loadProfile();
    });

});
