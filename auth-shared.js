(function () {

    document.addEventListener('DOMContentLoaded', function () {

        const signinTrigger = document.getElementById('signin-trigger');
        const userInfo      = document.getElementById('user-info');
        const userGreeting  = document.getElementById('user-greeting');
        const userBalance   = document.getElementById('user-balance');
        const logoutBtn     = document.getElementById('logout-btn');
        const cartCountEl   = document.getElementById('cart-count');

        const signinModal   = document.getElementById('signin-modal');
        const registerModal = document.getElementById('register-modal');
        const forgotModal   = document.getElementById('forgot-modal');

        const signinForm    = document.getElementById('signin-form');
        const signinEmail   = document.getElementById('signin-email');
        const signinPass    = document.getElementById('signin-password');
        const signinError   = document.getElementById('signin-error');

        const registerForm   = document.getElementById('register-form');
        const registerUser   = document.getElementById('register-username');
        const registerEmail  = document.getElementById('register-email');
        const registerPass   = document.getElementById('register-password');
        const registerError  = document.getElementById('register-error');
        const registerOk     = document.getElementById('register-success');

        const forgotForm   = document.getElementById('forgot-form');
        const forgotEmail  = document.getElementById('forgot-email');
        const forgotError  = document.getElementById('forgot-error');
        const forgotOk     = document.getElementById('forgot-success');

        const switchToRegister  = document.getElementById('switch-to-register');
        const switchToSignin    = document.getElementById('switch-to-signin');
        const switchToForgot    = document.getElementById('switch-to-forgot');
        const forgotBackToSignin = document.getElementById('forgot-back-to-signin');

        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;



        function openModal(modal) {
            document.querySelectorAll('.modal-overlay.is-open').forEach(m => m.classList.remove('is-open'));
            modal.classList.add('is-open');
            clearAllFormMessages();
        }

        function closeAllModals() {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('is-open'));
            clearAllFormMessages();
            if (signinForm) signinForm.reset();
            if (registerForm) registerForm.reset();
            if (forgotForm) forgotForm.reset();
        }

        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', closeAllModals);
        });

        [signinModal, registerModal, forgotModal].forEach(modal => {
            if (!modal) return;
            modal.addEventListener('click', function (event) {
                if (event.target === modal) closeAllModals();
            });
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeAllModals();
        });

        if (switchToRegister) {
            switchToRegister.addEventListener('click', function (e) {
                e.preventDefault();
                openModal(registerModal);
                registerUser.focus();
            });
        }

        if (switchToSignin) {
            switchToSignin.addEventListener('click', function (e) {
                e.preventDefault();
                openModal(signinModal);
                signinEmail.focus();
            });
        }

        if (switchToForgot) {
            switchToForgot.addEventListener('click', function (e) {
                e.preventDefault();
                openModal(forgotModal);
                if (signinEmail && signinEmail.value && forgotEmail) {
                    forgotEmail.value = signinEmail.value;
                }
                if (forgotEmail) forgotEmail.focus();
            });
        }

        if (forgotBackToSignin) {
            forgotBackToSignin.addEventListener('click', function (e) {
                e.preventDefault();
                openModal(signinModal);
                signinEmail.focus();
            });
        }

        if (signinTrigger) {
            signinTrigger.addEventListener('click', function () {
                openModal(signinModal);
                signinEmail.focus();
            });
        }



        function showError(el, message) {
            if (!el) return;
            el.textContent = message;
            el.classList.add('is-visible');
        }

        function showSuccess(el, message) {
            if (!el) return;
            el.textContent = message;
            el.classList.add('is-visible');
        }

        function clearAllFormMessages() {
            [signinError, registerError, registerOk, forgotError, forgotOk].forEach(el => {
                if (el) {
                    el.textContent = '';
                    el.classList.remove('is-visible');
                }
            });
        }



        if (signinForm) {
            signinForm.addEventListener('submit', async function (event) {
                event.preventDefault();
                clearAllFormMessages();

                const email = signinEmail.value.trim();
                const password = signinPass.value;

                if (email === '' && password === '') return showError(signinError, 'Please fill out both fields.');
                if (email === '') return showError(signinError, 'Please enter your email.');
                if (!EMAIL_REGEX.test(email)) return showError(signinError, 'That doesn\'t look like a valid email.');
                if (password === '') return showError(signinError, 'Please enter your password.');

                const { data, error } = await window.tempest.signInWithEmail(email, password);

                if (error) {
                    return showError(signinError, error.message || 'Sign in failed. Check your credentials.');
                }

                closeAllModals();
                await refreshAuthUI();
                window.dispatchEvent(new CustomEvent('tempest:auth-changed'));
            });
        }



        if (registerForm) {
            registerForm.addEventListener('submit', async function (event) {
                event.preventDefault();
                clearAllFormMessages();

                const username = registerUser.value.trim();
                const email = registerEmail.value.trim();
                const password = registerPass.value;

                if (username === '' || email === '' || password === '') return showError(registerError, 'All three fields are required.');
                if (!USERNAME_REGEX.test(username)) return showError(registerError, 'Username must be 3-20 characters: letters, numbers, or underscores.');
                if (!EMAIL_REGEX.test(email)) return showError(registerError, 'That doesn\'t look like a valid email.');
                if (password.length < 6) return showError(registerError, 'Password must be at least 6 characters.');

                const { data, error } = await window.tempest.registerNewUser(email, password, username);

                if (error) {
                    let msg = error.message || 'Registration failed.';
                    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
                        msg = 'That username or email is already taken.';
                    }
                    return showError(registerError, msg);
                }

                if (data.session) {
                    showSuccess(registerOk, 'Welcome aboard! You\'ve been logged in.');
                    setTimeout(() => {
                        closeAllModals();
                        refreshAuthUI();
                        window.dispatchEvent(new CustomEvent('tempest:auth-changed'));
                    }, 1200);
                } else {
                    showSuccess(registerOk, 'Account created! Check your email to confirm, then sign in.');
                }
            });
        }



        if (forgotForm) {
            forgotForm.addEventListener('submit', async function (event) {
                event.preventDefault();
                clearAllFormMessages();

                const email = forgotEmail.value.trim();

                if (email === '') return showError(forgotError, 'Please enter your email.');
                if (!EMAIL_REGEX.test(email)) return showError(forgotError, 'That doesn\'t look like a valid email.');

                const submitBtn = forgotForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';

                const { error } = await window.tempest.sendPasswordResetEmail(email);

                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Reset Link';

                if (error) {
                    console.error('Password reset error:', error);
                }

                showSuccess(forgotOk, 'If that email is registered, a reset link has been sent. Check your inbox (and spam folder).');
                forgotForm.reset();
            });
        }



        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function () {
                await window.tempest.signOutUser();
                await refreshAuthUI();
                window.dispatchEvent(new CustomEvent('tempest:auth-changed'));
            });
        }



        function ensureMyProfileLink() {
            if (!userInfo) return;
            if (document.getElementById('my-profile-link')) return;

            const profileLink = document.createElement('a');
            profileLink.href = 'profile.html';
            profileLink.id = 'my-profile-link';
            profileLink.className = 'my-items-link';
            profileLink.textContent = 'My Profile';

            const myItemsLink = userInfo.querySelector('.my-items-link[href="my-items.html"]');
            if (myItemsLink) {
                userInfo.insertBefore(profileLink, myItemsLink);
            } else {
                // Fall back to inserting before the logout button
                if (logoutBtn) {
                    userInfo.insertBefore(profileLink, logoutBtn);
                } else {
                    userInfo.appendChild(profileLink);
                }
            }
        }



        async function refreshAuthUI() {
            const profile = await window.tempest.getCurrentProfile();

            if (profile) {
                if (signinTrigger) signinTrigger.style.display = 'none';
                if (userInfo) userInfo.style.display = 'flex';
                if (userGreeting) userGreeting.textContent = 'Hi, ' + profile.username;
                if (userBalance) userBalance.textContent = '؏' + profile.squalls.toLocaleString();
                ensureMyProfileLink();
            } else {
                if (signinTrigger) signinTrigger.style.display = 'inline-block';
                if (userInfo) userInfo.style.display = 'none';
            }

            if (cartCountEl) {
                const count = await window.tempest.fetchCartCount();
                cartCountEl.textContent = count;
            }
        }



        refreshAuthUI();

        window.tempestDb.auth.onAuthStateChange(function (event, session) {
            refreshAuthUI();
        });

        window.tempestAuth = {
            refreshAuthUI: refreshAuthUI,
            openSigninModal: function () {
                if (signinModal) {
                    openModal(signinModal);
                    if (signinEmail) signinEmail.focus();
                }
            }
        };

    });

})();
