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
    _server;

    /**
     * The bearer token from login
     */
    _token;

    /**
     * Flag if user is logged in and authorized
     * @type {boolean}
     */
    _authorized = false;

    /**
     * Id of the checkStatus interval
     * @see {checkStatus}
     */
    _authCheckIntervalId;

    /**
     * @inheritDoc
     */
    init() {
      document.getElementById('csp-vestec-login-btn').addEventListener('click', this.login.bind(this));
      document.getElementById('csp-vestec-logout-btn').addEventListener('click', this.logout.bind(this));

      const formattedPos = () => CosmoScout.utils.formatLongitude(CosmoScout.state.observerLngLatHeight[0]) + CosmoScout.utils.formatLatitude(CosmoScout.state.observerLngLatHeight[1]);

      document.getElementById('csp-vestec-incident-select-upper-left').addEventListener('click', () => {
        document.getElementById('csp-vestec-incident-upper-left').value = formattedPos(); // TODO
      });

      document.getElementById('csp-vestec-incident-select-lower-right').addEventListener('click', () => {
        document.getElementById('csp-vestec-incident-lower-right').value = formattedPos(); // TODO
      });

      document.getElementById('csp-vestec-create-incident-btn').addEventListener('click', () => {
        document.getElementById('csp-vestec-incident-window').classList.toggle('visible');
      });

      document.getElementById('csp-vestec-incident-submit').addEventListener('click', this._submitIncident.bind(this));
    }

    /**
     * GETTER | SETTER
     */

    /**
     * Sets the vestec server url
     *
     * @param url {string}
     */
    setServer(url) {
      try {
        new URL('/', url);
      } catch (e) {
        CosmoScout.notifications.print('Invalid URL', 'The provided url is not valid.', 'error');

        return;
      }

      console.debug(`Set vestec server to ${url}`);
      this._server = url;
      document.getElementById('csp-vestec-server').innerText = url;
    }

    /**
     * @see {setServer}
     * @param url
     */
    set server(url) {
      this.setServer(url);
    }

    /**
     * @see {_server}
     * @returns {string}
     */
    get server() {
      return this._server;
    }

    /**
     * @see {_token}
     * @returns {string}
     */
    get token() {
      return this._token;
    }

    /**
     * Not accessible. Throws on access.
     *
     * @param token {string}
     * @throws {Error}
     */
    set token(token) {
      throw new Error('Setting the access token is not permitted');
    }

    /**
     * Flag if the user is authorized
     *
     * @see {checkStatus}
     * @returns {boolean} True if the user is logged in and authorized
     */
    get authorized() {
      return this._authorized;
    }

    /**
     * Not accessible. Throws on access.
     *
     * @param flag {boolean}
     * @throws {Error}
     */
    set authorized(flag) {
      throw new Error('Setting the auth state is not permitted');
    }

    /**
     * Vestec Api Interfacing Methods
     */

    /**
     * This call enables a user to login with the VESTEC system and returns a session token
     * which is then used for subsequent calls to uniquely identify this user within that session.
     * Calls /flask/login
     *
     * @returns {Promise<void>}
     */
    async login() {
      if (typeof this._server === 'undefined') {
        CosmoScout.notifications.print('Server undefined', 'Call \'setServer\' first.', 'error');

        return;
      }

      const username = document.getElementById('csp-vestec-username');
      const password = document.getElementById('csp-vestec-password');

      const setLoginInputValidity = (valid) => {
        if (!valid) {
          username.classList.remove('disabled');
          password.classList.remove('disabled');
          username.classList.add('is-invalid');
          password.classList.add('is-invalid');
        } else {
          username.classList.add('disabled');
          password.classList.add('disabled');
          username.classList.remove('is-invalid');
          password.classList.remove('is-invalid');
        }
      };

      if (username.value.length === 0 || password.value.length === 0) {
        setLoginInputValidity(false);

        return;
      }

      setLoginInputValidity(true);

      this._hide('login');
      this._show('status');
      this._statusText('Logging in...');

      CosmoScout.notifications.print('Login', 'Logging in...', 'play_arrow');

      await fetch(
        this._buildUrl('login'),
        this._buildRequestOptions('POST', {
          body: {
            username: username.value,
            password: password.value,
          },
        }),
      )
        .then((response) => {
          if (!response.ok) {
            this._show('login');

            CosmoScout.notifications.print('Login failed', `Error ${response.status}.`, 'error');

            console.error(response);

            return;
          }

          return response.json();
        })
        .then((response) => {
          if (typeof response.status !== 'undefined' && response.status === 400) {
            this._show('login');

            setLoginInputValidity(false);

            CosmoScout.notifications.print('Login failed', 'Invalid credentials.', 'warning');

            return;
          }

          if (typeof response.access_token === 'undefined') {
            CosmoScout.notifications.print('Missing token', 'Could not retrieve access token.', 'error');
            this._show('login');

            return;
          }

          this._token = response.access_token;

          CosmoScout.notifications.print('Login successful', 'Successfully logged in.', 'done');
          document.getElementById('csp-vestec-current-user').innerText = `Logged in as ${username.value}`;

          this._show('logout', 'create-incident');

          // Check if the user is still logged in each minute
          this.checkStatus()
            .then(() => {
              this._showIncidentWindowContent();
              this._authCheckIntervalId = setInterval(this.checkStatus.bind(this), 60000);
            });
        })
        .catch(this._defaultCatch.bind(this))
        .finally(() => {
          this._hide('status');
          this._statusText();
        });
    }

    /**
     * Check if user is still logged in and authorized
     * E.g. is the current session associated with this deemed as active or has it expired.
     * The authorization status can be accessed through CosmoScout.vestec.authorized
     * Calls /flask/authorised
     *
     * @returns {Promise<void>}
     */
    async checkStatus() {
      await fetch(
        this._buildUrl('authorised'),
        this._buildRequestOptions(),
      )
        .then((response) => response.json())
        .then((response) => {
          if (response.status === 403) {
            CosmoScout.notifications.print('Session expired', 'Please login again.', 'warning');
            this._handleLogout();
          } else if (response.status === 200) {
            this._authorized = true;
          }
        })
        .catch(this._defaultCatch.bind(this));
    }

    /**
     * This call logs out a user, deleting the current session for that user
     * so subsequent API calls with the token will be unauthorised
     *
     * @returns {Promise<void>}
     */
    async logout() {
      if (typeof this._server === 'undefined') {
        CosmoScout.notifications.print('Server undefined', 'Call \'setServer\' first.', 'error');

        return;
      }

      if (typeof this._token === 'undefined') {
        CosmoScout.notifications.print('Missing token', 'User is not logged in.', 'error');

        return;
      }

      await fetch(
        this._buildUrl('logout'),
        this._buildRequestOptions('DELETE'),
      )
        .then(() => {
          CosmoScout.notifications.print('Logout successful', 'Successfully logged out.', 'done');
          this._handleLogout();
        })
        .catch(this._defaultCatch.bind(this));
    }

    /**
     * Returns the available workflows for the user
     *
     * @returns {Promise<string[]>}
     * @throws {Error} If user is not logged in
     */
    async getWorkflows() {
      this._checkLogin();

      return fetch(
        this._buildUrl('getmyworkflows'),
        this._buildRequestOptions(),
      )
        .then((result) => result.json())
        .then((data) => {
          if (data.status !== 200 || typeof data.workflows === 'undefined') {
            console.error('Workflows field is undefined');

            return [];
          }

          return JSON.parse(data.workflows);
        })
        .catch(this._defaultCatch.bind(this));
    }

    /**
     * Retrieves a summary list of completed incidents
     *
     * @returns {Promise<{
     * uuid: string,
     * kind: string,
     * name: string,
     * status: string,
     * comment: string,
     * creator: string,
     * date_started: string,
     * date_completed: string,
     * upper_left_latlong: string,
     * lower_right_latlong,
     * duration: string,
     * incident_date: string
     * }[]>}
     * @throws {Error} If user is not logged in
     */
    async getIncidents() {
      this._checkLogin();

      return fetch(
        this._buildUrl('getincidents', {
          completed: true,
        }),
        this._buildRequestOptions(),
      )
        .then((result) => result.json())
        .then((data) => {
          if (data.status !== 200 || typeof data.incidents === 'undefined') {
            console.error('Incidents field is undefined');

            return [];
          }

          return JSON.parse(data.incidents);
        })
        .catch(this._defaultCatch.bind(this));
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

      this._authorized = false;
      delete this._token;

      clearInterval(this._authCheckIntervalId);

      this._hideIncidentWindowContent();
    }

    /**
     * The default catch method on network error
     *
     * @private
     */
    _defaultCatch() {
      this._handleLogout();

      CosmoScout.notifications.print('Connection failed', 'Could not connect to server.', 'error');
    }

    /**
     * Builds the vestec url
     *
     * @param part {string} The endpoint to access
     * @param data {Object} Uri params to append
     * @returns {string} The final url
     * @private
     */
    _buildUrl(part, data = {}) {
      if (typeof this._server === 'undefined') {
        throw new Error(`Vestec Server undefined. Call 'CosmoScout.${this.name}.setServer' first.`);
      }

      const url = new URL(`flask/${part}`, this._server);

      Object.keys(data).forEach((key) => {
        url.searchParams.append(key, data[key] ?? true);
      });

      return url.toString();
    }

    /**
     * Builds the fetch init object
     * appends the bearer token if present
     *
     * @param method {'GET'|'POST'|'DELETE'|'PUT'} ['GET'] The request method
     * @param options {Object} Fetch api options
     * @returns {RequestInit}
     * @private
     */
    _buildRequestOptions(method = 'GET', options = {}) {
      const base = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (typeof this._token !== 'undefined') {
        base.headers.Authorization = `Bearer ${this._token}`;
      }

      if (typeof options.body === 'object') {
        options.body = JSON.stringify(options.body, (_key, value) => {
          if (value !== null && String(value).length > 0) {
            return value;
          }

          return undefined;
        });
      }

      return Object.assign(base, options);
    }

    /**
     * Sets the innerText of 'vestec-status-text'
     * Text gets cleared if argument is missing or null
     *
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
     *
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
     *
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
     *
     * @private
     */
    _checkLogin() {
      if (!this._authorized) {
        CosmoScout.notifications.print('Not logged in', 'You are not logged in.', 'error');

        throw new Error('You are not logged in into the vestec system.');
      }
    }

    /**
     * Hides the create incident form content if the current user is not logged in
     *
     * @private
     */
    _hideIncidentWindowContent() {
      const window = document.querySelector('#csp-vestec-incident-window');

      window.querySelector('form').classList.add('hidden');
      window.querySelector('p').classList.remove('hidden');
    }

    /**
     * Shows the create incident form content and fills the workflows for the current user
     *
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
     *
     * @private
     */
    _fillIncidentWorkflows() {
      this.getWorkflows()
        .then((flows) => {
          if (flows.length === 0) {
            CosmoScout.notifications.print('No Workflows', 'There are no workflows registered.', 'warning');

            console.warn('No workflows registered');
            return;
          }

          const workflowSelect = document.getElementById('csp-vestec-incident-workflow');

          CosmoScout.gui.clearHtml(workflowSelect);

          flows.forEach((workflow) => {
            const option = document.createElement('option');
            option.value = workflow;
            option.text = workflow;
            workflowSelect.appendChild(option);
          });

          // CosmoScout.gui.initDropDowns();
        })
        .catch(() => {
          CosmoScout.notifications.print('Missing token', 'User is not logged in.', 'error');
        });
    }

    /**
     * Creates a new incident
     *
     * @returns {Promise<string|null>} The unique incident id or null on error
     * @private
     */
    async _submitIncident(event) {
      event.preventDefault();
      this._checkLogin();

      /**
       * @type {HTMLFormElement}
       */
      const form = document.querySelector('#csp-vestec-incident-window form');

      if (!form.checkValidity()) {
        form.reportValidity();

        return new Promise(() => {

        });
      }

      return fetch(
        this._buildUrl('createincident'),
        this._buildRequestOptions('POST', {
          body: {
            name: form.elements.namedItem('csp-vestec-incident-name').value,
            kind: form.elements.namedItem('csp-vestec-incident-workflow').value,
            upperLeftLatlong: form.elements.namedItem('csp-vestec-incident-upper-left').value,
            lowerRightLatlong: form.elements.namedItem('csp-vestec-incident-lower-right').value,
            duration: form.elements.namedItem('csp-vestec-incident-duration').value,
          },
        }),
      )
        .then((response) => response.json())
        .then((data) => {
          // TODO Status code currently missing in vestec response
          if (data.status === 400) {
            CosmoScout.notifications.print('Creation failed', 'Could not create incident.', 'error');
            console.error(data.msg);

            return null;
          } if (data.status === 200) {
            CosmoScout.notifications.print('Incident created', 'Successfully created incident.', 'done');

            form.reset();

            return data.incidentid;
          }

          return null;
        })
        .catch((e) => {
          console.log(e);
        });
    }
  }

  CosmoScout.init(VestecApi);
})();
