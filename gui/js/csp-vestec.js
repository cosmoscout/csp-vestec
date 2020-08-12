/* global IApi, CosmoScout */

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
     * Flag if user is logged in and authorized
     * @type {boolean}
     */
    authorized = false;

    /**
     * Id of the checkStatus interval
     * @see {checkStatus}
     */
    authCheckIntervalId;

    /**
     * @inheritDoc
     */
    init() {
      document.getElementById('csp-vestec-login-btn').addEventListener('click', this.login.bind(this));
      document.getElementById('csp-vestec-logout-btn').addEventListener('click', this.logout.bind(this));

      const formattedPos = () => {
        return CosmoScout.utils.formatLongitude(CosmoScout.state.observerLngLatHeight[0]) + CosmoScout.utils.formatLatitude(CosmoScout.state.observerLngLatHeight[1])
      };

      document.getElementById('csp-vestec-incident-select-upper-left').addEventListener('click', () => {
        document.getElementById('csp-vestec-incident-upper-left').value = formattedPos(); //TODO
      });

      document.getElementById('csp-vestec-incident-select-lower-right').addEventListener('click', () => {
        document.getElementById('csp-vestec-incident-lower-right').value = formattedPos(); //TODO
      });

      document.getElementById('csp-vestec-create-incident-btn').addEventListener('click', () => {
        document.getElementById('csp-vestec-incident-window').classList.toggle('visible');
      });
      
      document.getElementById('csp-vestec-incident-submit').addEventListener('click', this._submitIncident.bind(this));
      // Don't automatically submit form, leaves validity check active
      document.querySelector('#csp-vestec-incident-window form').addEventListener('submit', (event) => {
        event.preventDefault();
      });
    }

    /**
     * Sets the vestec server url
     * @param url {string}
     */
    setServer(url) {
      console.debug(`Set vestec server to ${url}`);
      this.server = url;
      document.getElementById('csp-vestec-server').innerText = url;
    }

    /**
     * This call enables a user to login with the VESTEC system and returns a session token
     * which is then used for subsequent calls to uniquely identify this user within that session.
     * @returns {Promise<void>}
     */
    async login() {
      if (typeof this.server === 'undefined') {
        CosmoScout.notifications.print('Server undefined', 'Call \'setServer\' first.', 'error');

        return;
      }

      const username = document.getElementById('csp-vestec-username');
      const password = document.getElementById('csp-vestec-password');

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
          username: username.value,
          password: password.value,
        }),
      }).then((response) => {
        if (!response.ok) {
          this._show('login');

          CosmoScout.notifications.print('Login failed', `Error ${response.status}.`, 'error');

          console.error(response);

          return;
        }

        return response.json();
      }).then((response) => {
        if (typeof response.status !== 'undefined' && response.status === 400) {
          this._show('login');

          username.classList.add('is-invalid');
          password.classList.add('is-invalid');

          CosmoScout.notifications.print('Login failed', 'Invalid credentials.', 'warning');

          return;
        }

        if (typeof response.access_token === 'undefined') {
          CosmoScout.notifications.print('Missing token', 'Could not retrieve access token.', 'error');
          this._show('login');

          return;
        }

        this.token = response.access_token;

        CosmoScout.notifications.print('Login successful', 'Successfully logged in.', 'done');
        document.getElementById('csp-vestec-current-user').innerText = `Logged in as ${username.value}`;

        this._show('logout', 'create-incident');

        // Check if the user is still logged in each minute
        this.checkStatus().then(() => {
          this._showIncidentWindowContent();
          this.authCheckIntervalId = setInterval(this.checkStatus.bind(this), 60000);
        });
      }).catch(this._defaultCatch.bind(this))
        .finally(() => {
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
      }).then((response) => response.json()).then((response) => {
        if (response.status === 403) {
          CosmoScout.notifications.print('Session expired', 'Please login again.', 'warning');
          this._handleLogout();
        } else if (response.status === 200) {
          this.authorized = true;
        }
      }).catch(this._defaultCatch.bind(this));
    }

    /**
     * This call logs out a user, deleting the current session for that user
     * so subsequent API calls with the token will be unauthorised
     *
     * @returns {Promise<void>}
     */
    async logout() {
      if (typeof this.server === 'undefined') {
        CosmoScout.notifications.print('Server undefined', 'Call \'setServer\' first.', 'error');

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
     * Returns the available workflows for the user
     * @returns {Promise<string[]>}
     * @throws {Error}
     */
    async getWorkflows() {
      this._checkLogin();

      return fetch(this._buildUrl('getmyworkflows'), {
        headers: this._buildHeaders(),
      }).then(result => {
        return result.json();
      }).then(data => {
        if (data.status !== 200 || typeof data.workflows === 'undefined') {
          console.error('Workflows field is undefined');

          return [];
        }

        return JSON.parse(data.workflows);
      }).catch(this._defaultCatch.bind(this));
    }

    /**
     * Retrieves a summary list of completed incidents
     * @returns {Promise<any>}
     * @throws {Error}
     */
    async getIncidents() {
      this._checkLogin();

      return fetch(this._buildUrl('getincidents', {
        completed: true,
      }), {
        headers: this._buildHeaders(),
      }).then(result => {
        return result.json();
      }).then(data => {
        if (data.status !== 200 || typeof data.incidents === 'undefined') {
          console.error('Incidents field is undefined');

          return [];
        }

        return JSON.parse(data.incidents);
      }).catch(this._defaultCatch.bind(this));
    }

    /**
     * Things to handle on logout
     *
     * @private
     */
    _handleLogout() {
      this._hide('logout', 'create-incident');
      this._show('login');
      document.getElementById('csp-vestec-current-user').innerText = '';

      this.authorized = false;
      delete this.token;

      clearInterval(this.authCheckIntervalId);

      this._hideIncidentWindowContent();
    }

    /**
     * The default catch method on network error
     * @private
     */
    _defaultCatch() {
      this._hide('logout', 'create-incident');
      this._hide('status');
      this._statusText();
      this._show('login');

      CosmoScout.notifications.print('Connection failed', 'Could not connect to server.', 'error');
    }

    /**
     * Builds the vestec url
     * @param part {string} The endpoint to access
     * @param data {Object} Uri params to append
     * @returns {string} The final url
     * @private
     */
    _buildUrl(part, data = {}) {
      if (typeof this.server === 'undefined') {
        throw new Error(`Vestec Server undefined. Call 'CosmoScout.${this.name}.setServer' first.`);
      }

      const url = new URL(`flask/${part}`, this.server);

      Object.keys(data).forEach(key => {
        url.searchParams.append(key, data[key] ?? true);
      });

      return url.toString();
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
        base.Authorization = `Bearer ${this.token}`;
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
        document.getElementById('csp-vestec-status-text').innerText = '';
      } else {
        document.getElementById('csp-vestec-status-text').innerText = text;
      }
    }

    /**
     * Adds the 'invisible' class from the provided element names
     * Elements ids are searched as 'vestec-ELEMENT-row'
     * @param elements {string}
     * @private
     */
    _hide(...elements) {
      elements.forEach((el) => {
        document.getElementById(`csp-vestec-${el}-row`).classList.add('invisible');
      });
    }

    /**
     * Removes the 'invisible' class from the provided element names
     * Elements ids are searched as 'vestec-ELEMENT-row'
     * @param elements {string}
     * @private
     */
    _show(...elements) {
      elements.forEach((el) => {
        document.getElementById(`csp-vestec-${el}-row`).classList.remove('invisible');
      });
    }

    /**
     * Throws an error if user is not logged in
     * @private
     */
    _checkLogin() {
      if (!this.authorized) {
        CosmoScout.notifications.print('Not logged in', 'You are not logged in.', 'error');

        throw new Error('You are not logged in into the vestec system.');
      }
    }

    /**
     * Hides the create incident form content if the current user is not logged into the vestec system
     * @private
     */
    _hideIncidentWindowContent() {
      const window = document.querySelector('#csp-vestec-incident-window');

      window.querySelector('form').classList.add('hidden');
      window.querySelector('p').classList.remove('hidden');
    }

    /**
     * Shows the create incident form content and fills the workflows for the current user
     * @private
     */
    _showIncidentWindowContent() {
      const window = document.querySelector('#csp-vestec-incident-window');

      window.querySelector('form').classList.remove('hidden');
      window.querySelector('p').classList.add('hidden');

      this._fillIncidentWorkflows();
    }

    /**
     * Fills the create incident workflow dropdown with the registered workflows for the current user
     * Gets automatically called on login
     * @private
     */
    _fillIncidentWorkflows() {
      this.getWorkflows().then(flows => {
        if (flows.length === 0) {
          console.warn('No workflows registered');
          return;
        }

        const workflowSelect = document.getElementById('csp-vestec-incident-workflow');

        CosmoScout.gui.clearHtml(workflowSelect);

        flows.forEach(workflow => {
          const option = document.createElement('option');
          option.value = workflow;
          option.text = workflow;
          workflowSelect.appendChild(option);
        })

        //CosmoScout.gui.initDropDowns();
      }).catch(() => {
        CosmoScout.notifications.print('Missing token', 'User is not logged in.', 'error');
      })
    }

    _submitIncident() {
      this._checkLogin();

      const form = document.querySelector('#csp-vestec-incident-window form');
      // Submit form
    }
  }

  CosmoScout.init(VestecApi);
})();
