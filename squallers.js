document.addEventListener('DOMContentLoaded', function () {

    const tbody = document.getElementById('squallers-body');


    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


    async function loadRankings() {
        const profile = await window.tempest.getCurrentProfile();
        const myUsername = profile ? profile.username : null;

        const data = await window.tempest.fetchTopSquallers(100);

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="listings-loading">No squallers yet. Be the first!</td></tr>';
            return;
        }

        const html = data.map((user, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            const isMe = user.username === myUsername;
            const myClass = isMe ? 'is-current-user' : '';

            const rankDisplay = rank <= 3
                ? `<span class="rank-medal rank-medal-${rank}">${rank}</span>`
                : rank;

            const usernameLink = `<a href="profile.html?username=${encodeURIComponent(user.username)}" class="username-link">${escapeHtml(user.username)}</a>`;

            return `
                <tr class="${rankClass} ${myClass}">
                    <td class="col-rank">${rankDisplay}</td>
                    <td class="col-user">${usernameLink}${isMe ? ' <span class="you-tag">YOU</span>' : ''}</td>
                    <td class="col-num">${user.item_count}</td>
                    <td class="col-money">؏${Number(user.item_value).toLocaleString()}</td>
                    <td class="col-money col-wallet"><strong>؏${Number(user.squalls).toLocaleString()}</strong></td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    }


    loadRankings();

    window.addEventListener('tempest:auth-changed', function () {
        loadRankings();
    });

});
