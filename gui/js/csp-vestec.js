/* global IApi, CosmoScout, Vestec */

(() => {
  class VestecApi extends IApi {
    /**
     * @inheritDoc
     */
    name = 'vestec';

    /**
     * @type {Vestec}
     * @private
     */
    _vestecApi;

    /**
     * Id of the checkStatus interval
     * @see {_enableAuthIntervalChecks}
     */
    _authCheckIntervalId

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

      this._vestecApi = new Vestec();
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
        this._vestecApi.server = url;
      } catch (e) {
        CosmoScout.notifications.print('Invalid URL', 'The provided url is not valid.', 'error');

        return;
      }

      console.debug(`Set vestec server to ${url}`);
      document.getElementById('csp-vestec-server').innerText = this._vestecApi.server;
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
      const username = document.getElementById('csp-vestec-username');
      const password = document.getElementById('csp-vestec-password');

      const setLoginInputValidity = (valid) => {
        if (!valid) {
          username.classList.remove('disabled');
          password.classList.remove('disabled');
          username.classList.add('is-invalid');
          password.classList.add('is-invalid');
          this._hide('status');
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

      const response = await this._vestecApi
        .login(username.value, password.value)
        .catch(this._defaultCatch.bind(this));

      const data = await response.json();

      if (response.status !== 200) {
        this._show('login');

        setLoginInputValidity(false);

        CosmoScout.notifications.print('Login failed', response.statusText, 'warning');

        return;
      }

      if (typeof data.access_token === 'undefined') {
        CosmoScout.notifications.print('Missing token', 'Could not retrieve access token.', 'error');
        this._show('login');

        return;
      }

      CosmoScout.notifications.print('Login successful', 'Successfully logged in.', 'done');
      document.getElementById('csp-vestec-current-user').innerText = `Logged in as ${username.value}`;

      this._show('logout', 'create-incident');

      this._vestecApi.authorized()
        .then((authResponse) => {
          if (authResponse.status === 200) {
            this._enableAuthIntervalChecks();
            this._showIncidentWindowContent();
          } else if (authResponse.status === 403) {
            CosmoScout.notifications.print('Unauthorized', 'Account not authorized.', 'warning');
          }
        })
        .catch(this._defaultCatch.bind(this));

      this._hide('status');
      this._statusText();
    }

    /**
     * This call logs out a user, deleting the current session for that user
     * so subsequent API calls with the token will be unauthorised
     *
     * @returns {Promise<void>}
     */
    async logout() {
      const response = await this._vestecApi
        .logout()
        .catch(this._defaultCatch.bind(this));

      if (response.status === 200) {
        CosmoScout.notifications.print('Logout successful', 'Successfully logged out.', 'done');
        this._handleLogout();
      } else {
        CosmoScout.notifications.print('Logout unsuccessful', 'Could not logout.', 'error');
      }
    }

    /**
     * Returns the available workflows for the user
     *
     * @returns {Promise<string[]>}
     * @throws {Error} If user is not logged in
     */
    async getWorkflows() {
      const response = await this._vestecApi
        .getWorkflows()
        .catch(this._defaultCatch.bind(this));

      const data = await response.json();

      if (response.status !== 200 || typeof data.workflows === 'undefined') {
        console.error('Workflows field is undefined');

        return [];
      }

      return JSON.parse(data.workflows);
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
      const response = await this._vestecApi
        .getIncidents('completed')
        .catch(this._defaultCatch.bind(this));

      const data = await response.json();

      if (response.status !== 200 || typeof data.incidents === 'undefined') {
        console.error('Incidents field is undefined');

        return [];
      }

      return JSON.parse(data.incidents);
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

      this._disableAuthIntervalChecks();

      this._hideIncidentWindowContent();
    }

    /**
     * The default catch method on network error
     *
     * @private
     */
    _defaultCatch() {
      CosmoScout.notifications.print('Connection failed', 'Could not connect to server.', 'error');
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
      if (!this._vestecApi.isAuthorized()) {
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
    async _fillIncidentWorkflows() {
      const workflows = await this.getWorkflows();

      if (workflows.length === 0) {
        CosmoScout.notifications.print('No Workflows', 'There are no workflows registered.', 'warning');

        console.warn('No workflows registered');
        return;
      }

      const workflowSelect = document.getElementById('csp-vestec-incident-workflow');

      CosmoScout.gui.clearHtml(workflowSelect);

      workflows.forEach((workflow) => {
        const option = document.createElement('option');
        option.value = workflow;
        option.text = workflow;
        workflowSelect.appendChild(option);
      });

      // CosmoScout.gui.initDropDowns();
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

        return null;
      }

      const response = await this._vestecApi.createIncident(
        form.elements.namedItem('csp-vestec-incident-name').value,
        form.elements.namedItem('csp-vestec-incident-workflow').value,
        form.elements.namedItem('csp-vestec-incident-upper-left').value,
        form.elements.namedItem('csp-vestec-incident-lower-right').value,
        form.elements.namedItem('csp-vestec-incident-duration').value,
      );

      // TODO Status code currently missing in vestec response
      if (response.status === 400) {
        CosmoScout.notifications.print('Creation failed', 'Could not create incident.', 'error');
        console.error(response.statusText);

        return null;
      }

      if (response.status === 201) {
        CosmoScout.notifications.print('Incident created', 'Successfully created incident.', 'done');

        form.reset();

        const data = await response.json();

        return data.incidentid;
      }
    }

    /**
     * Enable checking if the user is authorized each interval seconds
     *
     * @param interval {number} Interval in seconds
     * @private
     */
    _enableAuthIntervalChecks(interval = 60) {
      if (typeof this._authCheckIntervalId !== 'undefined') {
        this._authCheckIntervalId = setInterval(this.authorized().bind(this), interval * 1000);
      }
    }

    /**
     * Disable the auth check
     *
     * @private
     */
    _disableAuthIntervalChecks() {
      if (typeof this._authCheckIntervalId !== 'undefined') {
        clearInterval(this._authCheckIntervalId);
        delete this._authCheckIntervalId;
      }
    }
  }

  CosmoScout.init(VestecApi);
})();
