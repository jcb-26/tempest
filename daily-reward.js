document.addEventListener('DOMContentLoaded', function () {

    const container = document.getElementById('daily-reward-container');
    if (!container) return;


    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


    async function loadAndRender() {
        const status = await window.tempest.fetchDailyRewardStatus();

        // Not signed in -> hide entirely
        if (!status || !status.signed_in) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';

        if (status.can_claim) {
            renderClaimable(status);
        } else {
            renderAlreadyClaimed(status);
        }
    }


    function renderClaimable(status) {
        const displayedStreak = status.displayed_streak || 0;
        const streakAfter = status.streak_after_claim;
        const reward = status.today_reward;

        let headlineHtml;
        let subtitleHtml;

        if (displayedStreak === 0 && streakAfter === 1) {
            headlineHtml = `Start your streak today!`;
            subtitleHtml = `Claim your first daily reward and start earning more squalls.`;
        } else if (status.streak_will_reset) {
            headlineHtml = `Welcome back!`;
            subtitleHtml = `Your <strong>${displayedStreak}-day streak</strong> ended. Start a new one today.`;
        } else {
            headlineHtml = `Day ${streakAfter} streak!`;
            subtitleHtml = `Claim today to keep your streak alive. Tomorrow's reward grows even bigger.`;
        }

        container.innerHTML = `
            <div class="reward-banner reward-banner-claimable">
                <div class="reward-banner-icon">🔥</div>
                <div class="reward-banner-text">
                    <h3 class="reward-banner-headline">${headlineHtml}</h3>
                    <p class="reward-banner-subtitle">${subtitleHtml}</p>
                </div>
                <div class="reward-banner-action">
                    <button type="button" class="reward-claim-btn" id="reward-claim-btn">
                        Claim ؏${reward}
                    </button>
                </div>
            </div>
        `;

        document.getElementById('reward-claim-btn').addEventListener('click', handleClaim);
    }


    function renderAlreadyClaimed(status) {
        const streak = status.current_streak;
        const nextReward = status.next_reward;

        container.innerHTML = `
            <div class="reward-banner reward-banner-claimed">
                <div class="reward-banner-icon">✓</div>
                <div class="reward-banner-text">
                    <h3 class="reward-banner-headline">Reward claimed for today!</h3>
                    <p class="reward-banner-subtitle">
                        ${streak}-day streak active. Come back tomorrow for <strong>؏${nextReward}</strong>.
                    </p>
                </div>
                <div class="reward-banner-streak">
                    <div class="streak-number">${streak}</div>
                    <div class="streak-label">day streak</div>
                </div>
            </div>
        `;
    }


    // ============== CLAIM ==============

    async function handleClaim() {
        const btn = document.getElementById('reward-claim-btn');
        btn.disabled = true;
        btn.textContent = 'Claiming...';

        const result = await window.tempest.claimDailyReward();

        if (!result.success) {
            // If they already claimed (e.g. claimed in another tab), just re-render
            if (result.already_claimed) {
                await loadAndRender();
                return;
            }
            btn.textContent = 'Error';
            setTimeout(() => {
                btn.disabled = false;
                loadAndRender();
            }, 1500);
            return;
        }

        // Render the success state
        renderClaimedToast(result);

        // Update the header balance
        window.tempestAuth.refreshAuthUI();

        // After the toast, swap to the "already claimed" banner
        setTimeout(loadAndRender, 2400);

        // Refresh leaderboard since balance changed
        window.dispatchEvent(new CustomEvent('tempest:balance-changed'));
    }


    function renderClaimedToast(result) {
        const streak = result.new_streak;
        const reward = result.reward;
        const nextReward = result.next_reward;
        const capped = result.streak_capped;

        const cappedNote = capped
            ? `<p class="reward-toast-note">Streak rewards cap at ؏300/day, but your streak keeps counting.</p>`
            : `<p class="reward-toast-note">Tomorrow: <strong>؏${nextReward}</strong></p>`;

        container.innerHTML = `
            <div class="reward-banner reward-banner-success">
                <div class="reward-toast">
                    <div class="reward-toast-icon">+؏${reward}</div>
                    <div class="reward-toast-body">
                        <h3 class="reward-toast-headline">Day ${streak} of your streak!</h3>
                        ${cappedNote}
                    </div>
                </div>
            </div>
        `;
    }


    // ============== INIT ==============

    loadAndRender();

    window.addEventListener('tempest:auth-changed', loadAndRender);

});
