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

        token;

        statusElement;

        /**
         * @inheritDoc
         */
        init() {
            this.statusElement = document.getElementById('vestec-response');
            document.getElementById('vestec-login-btn').addEventListener('click', this.login.bind(this));
        }


        /**
         * Sets the vestec server url
         * @param url
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
                this.statusElement.innerText = `Vestec server undefined. Call 'setServer' first.`;

                return;
            }

            const username = document.getElementById('vestec-username');
            const password = document.getElementById('vestec-password');

            username.classList.add('disabled');
            password.classList.add('disabled');

            const row = document.getElementById('vestec-login-row');

            row.classList.add('d-none');
            this.statusElement.innerText = 'Logging in...';

            const response = await fetch(this._buildUrl('login'), {
                method: 'POST',
                headers: this._buildHeaders(),
                body: JSON.stringify({
                    'username': username.value,
                    'password': password.value
                })
            }).then(value => {
                if (!value.ok) {
                    row.classList.remove('d-none');

                    if (value.status === 400) {
                        username.classList.add('is-invalid');
                        password.classList.add('is-invalid');

                        this.statusElement.innerText = 'Invalid credentials';
                    } else {
                        this.statusElement.innerText = `Could not connect to server, error ${value.status}.`;
                        console.error(value);
                    }

                    return;
                }

                value.body.getReader().read().then(token => {
                    this.token = token;

                    document.getElementById('vestec-logout-row').classList.remove('d-none');
                });
            }).catch(() => {
                row.classList.remove('d-none');
                this.statusElement.innerText = `Could not connect to server.`;
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
                if (response.status === 403) {
                    // Logged Out
                }
            }).catch(() => {
                // Logged out
            });
        }

        /**
         * This call logs out a user, deleting the current session for that user so subsequent API calls with the token will be unauthorised
         * @returns {Promise<void>}
         */
        async logout() {
            if (typeof this.server === 'undefined' || typeof this.token === 'undefined') {
                this.statusElement.innerText = 'No Server or token set.';

                return;
            }

            await fetch(this._buildUrl('logout'), {
                method: 'DELETE',
                headers: this._buildHeaders(),
            }).then(() => {
                delete this.token;
            });
        }

        _buildUrl(part) {
            if (typeof this.server === 'undefined') {
                throw new Error(`Vestec Server undefined. Call 'CosmoScout.${this.name}.setServer' first.`);
            }

            return `${this.server}/flask/${part}`;
        }

        _buildHeaders() {
            const base = {
                'Content-Type': 'application/json',
            };

            if (typeof this.token !== 'undefined') {
                base['Authorization'] = `Bearer ${this.token}`;
            }

            return base;
        }
    }

    CosmoScout.init(VestecLoginApi);
})();