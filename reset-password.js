document.addEventListener('DOMContentLoaded', function () {

    const loadingCard = document.getElementById('reset-loading');
    const invalidCard = document.getElementById('reset-invalid');
    const formCard    = document.getElementById('reset-form-card');
    const successCard = document.getElementById('reset-success');
    const subtitleEl  = document.getElementById('reset-subtitle');

    const resetForm   = document.getElementById('reset-form');
    const newPassword = document.getElementById('new-password');
    const confirmPwd  = document.getElementById('confirm-password');
    const errorBox    = document.getElementById('reset-error');


    function show(card) {
        [loadingCard, invalidCard, formCard, successCard].forEach(c => {
            c.style.display = 'none';
        });
        card.style.display = 'block';
    }

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.add('is-visible');
    }

    function clearError() {
        errorBox.textContent = '';
        errorBox.classList.remove('is-visible');
    }

    let recoverySessionDetected = false;

    window.tempestDb.auth.onAuthStateChange(function (event, session) {
        if (event === 'PASSWORD_RECOVERY') {
            recoverySessionDetected = true;
            show(formCard);
            newPassword.focus();
        }
    });
    setTimeout(async function () {
        if (recoverySessionDetected) return;

        const { data } = await window.tempestDb.auth.getSession();
        if (data.session) {
            show(formCard);
            newPassword.focus();
        } else {
            show(invalidCard);
            subtitleEl.style.display = 'none';
        }
    }, 1500);

    resetForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearError();

        const pwd = newPassword.value;
        const confirm = confirmPwd.value;

        if (pwd === '' || confirm === '') {
            return showError('Please fill in both fields.');
        }
        if (pwd.length < 6) {
            return showError('Password must be at least 6 characters long.');
        }
        if (pwd !== confirm) {
            return showError('Passwords do not match.');
        }

        const submitBtn = resetForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        const { error } = await window.tempest.updateUserPassword(pwd);

        if (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';
            return showError(error.message || 'Failed to update password. The reset link may have expired.');
        }
        show(successCard);
        subtitleEl.style.display = 'none';
    });

});
