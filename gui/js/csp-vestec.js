/* global IApi, CosmoScout, $ */

(() => {
    class VestecApi extends IApi {
        /**
         * @inheritDoc
         */
        name = 'vestec';

        /**
         * The vestec server to connect to
         * @see {setServer}
         */
        server;

        /**
         * The bearer token from login
         */
        token;

        /**
         * Id of the checkStatus interval
         * @see {checkStatus}
         */
        authCheckIntervalId;

        /**
         * @inheritDoc
         */
        init() {
            document.getElementById('vestec-login-btn').addEventListener('click', this.login.bind(this));
            document.getElementById('vestec-logout-btn').addEventListener('click', this.logout.bind(this));
        }

        /**
         * Sets the vestec server url
         * @param url {string}
         */
        setServer(url) {
            console.debug(`Set vestec server to ${url}`);
            this.server = url;
            document.getElementById('vestec-server').innerText = url;
        }

        /**
         * This call enables a user to login with the VESTEC system and returns a session token which is then used for subsequent calls to uniquely identify this user within that session.
         * @returns {Promise<void>}
         */
        async login() {
            if (typeof this.server === 'undefined') {
                CosmoScout.notifications.print('Server undefined', `Call 'setServer' first.`, 'error');

                return;
            }

            const username = document.getElementById('vestec-username');
            const password = document.getElementById('vestec-password');

            if (username.value.length === 0 || password.value.length === 0) {
                username.classList.add('is-invalid');
                password.classList.add('is-invalid');

                return;
            }

            username.classList.add('disabled');
            password.classList.add('disabled');
            username.classList.remove('is-invalid');
            password.classList.remove('is-invalid');

            this._hide('login');
            this._show('status');
            this._statusText('Logging in...');

            CosmoScout.notifications.print('Login', 'Logging in...', 'play_arrow');

            await fetch(this._buildUrl('login'), {
                method: 'POST',
                headers: this._buildHeaders(),
                body: JSON.stringify({
                    'username': username.value,
                    'password': password.value
                })
            }).then(response => {
                if (!response.ok) {
                    this._show('login');

                    CosmoScout.notifications.print('Login failed', `Error ${response.status}.`, 'error');

                    console.error(response);

                    return;
                }

                return response.json();
            }).then(response => {
                if (typeof response.status !== 'undefined' && response.status === 400) {
                    this._show('login');

                    username.classList.add('is-invalid');
                    password.classList.add('is-invalid');

                    CosmoScout.notifications.print('Login failed', 'Invalid credentials.', 'warning');

                    return;
                }

                if (typeof response.access_token === 'undefined') {
                    CosmoScout.notifications.print('Missing token', 'Could not retreive access token.', 'error');
                    this._show('login');

                    return;
                }

                this.token = response.access_token;

                CosmoScout.notifications.print('Login successful', 'Successfully logged in.', 'done');
                document.getElementById('vestec-current-user').innerText = `Logged in as ${username.value}`;

                this._show('logout');

                // Check if the user is still logged in each minute
                this.authCheckIntervalId = setInterval(this.checkStatus.bind(this), 60000);
            }).catch(this._defaultCatch.bind(this)).finally(() => {
                this._hide('status');
                this._statusText();
            });
        }

        /**
         * Check if user is still logged in and authorized
         * E.g. is the current session associated with this deemed as active or has it expired.
         */
        async checkStatus() {
            await fetch(this._buildUrl('authorised'), {
                headers: this._buildHeaders(),
            }).then(response => {
                return response.json();
            }).then(response => {
                if (response.status === 403) {
                    CosmoScout.notifications.print('Session expired', 'Please login again.', 'warning');
                    this._handleLogout();
                }
            }).catch(this._defaultCatch.bind(this));
        }

        /**
         * This call logs out a user, deleting the current session for that user so subsequent API calls with the token will be unauthorised
         *
         * @returns {Promise<void>}
         */
        async logout() {
            if (typeof this.server === 'undefined') {
                CosmoScout.notifications.print('Server undefined', `Call 'setServer' first.`, 'error');

                return;
            }

            if (typeof this.token === 'undefined') {
                CosmoScout.notifications.print('Missing token', 'User is not logged in.', 'error');

                return;
            }

            await fetch(this._buildUrl('logout'), {
                method: 'DELETE',
                headers: this._buildHeaders(),
            }).then(() => {
                CosmoScout.notifications.print('Logout successful', 'Successfully logged out.', 'done');
                this._handleLogout();
            }).catch(this._defaultCatch.bind(this));
        }

        /**
         * Things to handle on logout
         *
         * @private
         */
        _handleLogout() {
            this._hide('logout');
            this._show('login');
            document.getElementById('vestec-current-user').innerText = '';

            delete this.token;

            clearInterval(this.authCheckIntervalId);
        }

        /**
         * The default catch method on network error
         * @private
         */
        _defaultCatch() {
            this._hide('logout');
            this._hide('status');
            this._statusText();
            this._show('login');

            CosmoScout.notifications.print('Connection failed', 'Could not connect to server.', 'error');
        }

        /**
         * Builds the vestec url
         * @param part {string} The endpoint to access
         * @returns {string} The final url
         * @private
         */
        _buildUrl(part) {
            if (typeof this.server === 'undefined') {
                throw new Error(`Vestec Server undefined. Call 'CosmoScout.${this.name}.setServer' first.`);
            }

            return `${this.server}/flask/${part}`;
        }

        /**
         * Builds the request headers
         * appends the bearer token if present
         * @returns {{"Content-Type": string}}
         * @private
         */
        _buildHeaders() {
            const base = {
                'Content-Type': 'application/json',
            };

            if (typeof this.token !== 'undefined') {
                base['Authorization'] = `Bearer ${this.token}`;
            }

            return base;
        }

        /**
         * Sets the innerText of 'vestec-status-text'
         * Text gets cleared if argument is missing or null
         * @param text {string|null}
         * @private
         */
        _statusText(text = null) {
            if (text === null) {
                document.getElementById('vestec-status-text').innerText = '';
            } else {
                document.getElementById('vestec-status-text').innerText = text;
            }
        }

        /**
         * Adds the 'invisible' class from the provided element names
         * Elements ids are searched as 'vestec-ELEMENT-row'
         * @param elements {string}
         * @private
         */
        _hide(...elements) {
            elements.forEach(el => {
                document.getElementById(`vestec-${el}-row`).classList.add('invisible');
            });
        }

        /**
         * Removes the 'invisible' class from the provided element names
         * Elements ids are searched as 'vestec-ELEMENT-row'
         * @param elements {string}
         * @private
         */
        _show(...elements) {
            elements.forEach(el => {
                document.getElementById(`vestec-${el}-row`).classList.remove('invisible');
            });
        }
    }

    CosmoScout.init(VestecApi);
})();