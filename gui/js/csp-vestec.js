/* global IApi, CosmoScout, Vestec, $ */

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
     *
     * @see {_enableAuthIntervalChecks}
     * @private
     */
    _authCheckIntervalId

    /**
     * Base path of downloaded vestec datasets
     *
     * @private
     */
    _downloadDir = null;

    /**
     * HTML Elements with selectors used more than once / in callbacks
     */

    /**
     * Sidebar status text, shows 'Logging in...' / 'Logged in as...'
     *
     * @type {HTMLSpanElement}
     * @private
     */
    _statusTextElement;

    /**
     * Sidebar username input
     *
     * @type {HTMLInputElement}
     * @private
     */
    _usernameInput;

    /**
     * Sidebar password input
     *
     * @type {HTMLInputElement}
     * @private
     */
    _passwordInput;

    /**
     * Create incident window
     *
     * @type {HTMLElement}
     * @private
     */
    _incidentWindow;

    /**
     * Create incident upper left lat long input
     *
     * @type {HTMLInputElement}
     * @private
     */
    _incidentUpperLeftInput;

    /**
     * Create incident lower right lat long input
     *
     * @type {HTMLInputElement}
     * @private
     */
    _incidentLowerRightInput;

    /**
     * @inheritDoc
     */
    init() {
      this._statusTextElement =
          /** @type {HTMLSpanElement} */ document.getElementById('csp-vestec-status-text');
      this._usernameInput =
          /** @type {HTMLInputElement} */ document.getElementById('csp-vestec-username');
      this._passwordInput =
          /** @type {HTMLInputElement} */ document.getElementById('csp-vestec-password');
      this._incidentWindow = document.getElementById('csp-vestec-incident-window');
      this._incidentUpperLeftInput =
          /** @type {HTMLInputElement} */ document.getElementById('csp-vestec-incident-upper-left');
      this._incidentLowerRightInput =
          /** @type {HTMLInputElement} */ document.getElementById(
              'csp-vestec-incident-lower-right');

      document.getElementById('csp-vestec-login-btn').addEventListener('click', () => {
        this.login(
            this._usernameInput.value,
            this._passwordInput.value,
        );
      });

      document.getElementById('csp-vestec-logout-btn')
          .addEventListener('click', this.logout.bind(this));

      document.getElementById('csp-vestec-incident-select-upper-left')
          .addEventListener('click', () => {
            CosmoScout.notifications.print(
                'Set Start Region', 'Move the mark.', 'add_circle_outline');
            window.callNative('vestec.addStartMark');
          });

      document.getElementById('csp-vestec-create-incident-btn').addEventListener('click', () => {
        this._incidentWindow.classList.toggle('visible');
      });

      document.getElementById('csp-vestec-incident-submit')
          .addEventListener('click', this._submitIncident.bind(this));

      this._vestecApi = new Vestec();
    }

    /**
     * Callback used by the vestec plugin to set the upper left incident lat
     * long Position is set through a movable mark
     *
     * @param {string} data
     */
    setStartLatLong(data) {
      // Todo format according to vestec
      this._incidentUpperLeftInput.value = data;
    }

    /**
     * Callback used by the vestec plugin to set the lower right incident lat
     * long Position is set through a movable mark
     *
     * @param {string} data
     */
    setEndLatLong(data) {
      // Todo format according to vestec
      this._incidentLowerRightInput.value = data;
    }

    /**
     * GETTER | SETTER
     */

    /**
     * Sets the vestec server url
     *
     * @param {string} url - The vestec server url/ip including 'http(s)://'
     */
    setServer(url) {
      try {
        this._vestecApi.server = url;
      } catch (e) {
        CosmoScout.notifications.print('Invalid URL', 'The provided url is not valid.', 'error');

        return;
      }

      window.callNative('vestec.setServer', this._vestecApi.server);

      console.debug(`Set vestec server to ${url}`);
      document.getElementById('csp-vestec-server').innerText = this._vestecApi.server;
    }

    /**
     * Sets the base path of downloaded vestec data
     *
     * @param {string} path - Path where vestec data gets downloaded to, config
     * key 'vestec-download-dir'
     */
    setDownloadDir(path) {
      this._downloadDir = path;
    }

    /**
     * @throws {Error} If downloadDir is null
     * @returns {string}
     */
    get downloadDir() {
      if (this._downloadDir === null) {
        throw new Error(
            "Vestec download dir is not set. Call 'CosmoScout.vestec.setDownloadDir(PATH)' first.");
      }

      return /** @type {string} */ this._downloadDir;
    }

    /**
     * Passthrough method
     *
     * @see {Vestec.token}
     * @returns {string} Auth token
     */
    getToken() {
      return this._vestecApi.token;
    }

    /**
     * @returns {Vestec}
     */
    get api() {
      return this._vestecApi;
    }

    /**
     * Vestec Api Interfacing Methods
     */

    /**
     * This call enables a user to login with the VESTEC system and returns a
     * session token which is then used for subsequent calls to uniquely
     * identify this user within that session. Calls /flask/login
     *
     * @param {string} username
     * @param {string} password
     * @returns {Promise<boolean>} True on success
     */
    async login(username, password) {
      if (username.length === 0 || password.length === 0) {
        this._setLoginInputValidity(false);

        return false;
      }

      this._setLoginInputValidity(true);

      this._hide('login');
      this._show('status');
      this._statusText('Logging in...');

      CosmoScout.notifications.print('Login', 'Logging in...', 'play_arrow');

      const response = await this._vestecApi.login(username, password).catch(() => {
        this._handleLogout();
        this._defaultCatch();
      });

      const data = await response.json();

      if (response.status !== 200) {
        this._show('login');

        this._setLoginInputValidity(false);

        CosmoScout.notifications.print('Login failed', response.statusText, 'warning');

        return false;
      }

      if (typeof data.access_token === 'undefined') {
        CosmoScout.notifications.print(
            'Missing token',
            'Could not retrieve access token.',
            'error',
        );
        this._show('login');

        return false;
      }

      CosmoScout.notifications.print('Login successful', 'Successfully logged in.', 'done');
      document.getElementById('csp-vestec-current-user').innerText = `Logged in as ${username}`;

      this._show('logout', 'create-incident');

      const authorized = await this._vestecApi.authorized()
                             .then((authResponse) => {
                               if (authResponse.status === 200) {
                                 this._enableAuthIntervalChecks();
                                 this._showIncidentWindowContent();
                                 CosmoScout.vestecNE.updateEditor();
                                 return true;
                               }

                               if (authResponse.status === 403) {
                                 CosmoScout.notifications.print(
                                     'Unauthorized', 'Account not authorized.', 'warning');
                               }

                               return false;
                             })
                             .catch(this._defaultCatch.bind(this));

      this._hide('status');
      this._statusText();

      return authorized;
    }

    /**
     * This call logs out a user, deleting the current session for that user
     * so subsequent API calls with the token will be unauthorised
     *
     * @returns {Promise<void>}
     */
    async logout() {
      const response = await this._vestecApi.logout().catch(this._defaultCatch.bind(this));

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
      const response = await this._vestecApi.getWorkflows().catch(this._defaultCatch.bind(this));

      const data = await response.json();

      if (response.status !== 200) {
        console.error('Error retrieving workflows.');

        return [];
      }

      return data;
    }

    /**
     * Retrieves a summary list of completed incidents
     */
    async getIncidents() {
      const response = await this._vestecApi.getIncidents('active', 'completed', 'pending')
                           .catch(this._defaultCatch.bind(this));

      const data = await response.json();

      if (response.status !== 200) {
        console.error('Error retrieving incidents.');

        return [];
      }

      return data;
    }

    /**
     * Retrieves a specific incident
     */
    async getIncident(uuid) {
      const response = await this._vestecApi.getIncident(uuid).catch(this._defaultCatch.bind(this));

      const data = await response.json();

      if (response.status !== 200) {
        console.error('Error retrieving incident.');

        return [];
      }

      return data;
    }

    /**
     * Retrieves a summary list of completed incidents
     *
     * @param {string} incidentId - UUID of the incident the dataset is
     * registered on
     * @returns {Promise<[{uuid: String, date_created: String, name: String}]>}
     */
    async getIncidentDatasets(incidentId) {
      const response =
          await this._vestecApi.getIncident(incidentId).catch(this._defaultCatch.bind(this));

      const data = await response.json();

      if (response.status !== 200 || typeof data.data_sets === 'undefined') {
        console.error('Error retrieving datasets.');

        return [];
      }

      return data.data_sets;
    }

    /**
     * Retrieves metadata of a singular dataset
     *
     * @param {string} datasetId - UUID of the dataset
     * @param {string} incidentId - UUID of the incident the dataset is
     * registered on
     * @returns {Promise<*[]|*>}
     */
    async getIncidentDatasetMetadata(datasetId, incidentId) {
      const response = await this._vestecApi.getIncidentDatasetMetadata(datasetId, incidentId)
                           .catch(this._defaultCatch.bind(this));

      const data = await response.json();

      if (response.status !== 200) {
        console.error('Error retrieving dataset metadata.');

        return [];
      }

      return data;
    }

    /**
     * Wrapper for Vestec.isAuthorized
     *
     * @see {Vestec.isAuthorized}
     * @returns {boolean}
     */
    isAuthorized() {
      return this._vestecApi.isAuthorized();
    }

    /**
     * Things to handle on logout
     *
     * @private
     */
    _handleLogout() {
      this._hide('logout', 'create-incident', 'status');
      this._show('login');
      document.getElementById('csp-vestec-current-user').innerText = '';

      this._disableAuthIntervalChecks();

      this._hideIncidentWindowContent();

      CosmoScout.vestecNE.updateEditor();
    }

    /**
     * The default catch method on network error
     *
     * @private
     */
    _defaultCatch() {
      CosmoScout.notifications.print('Connection failed', 'Could not connect to server.', 'error');
      throw new Error('Connection timed out.');
    }

    /**
     * Sets the innerText of 'vestec-status-text'
     * Text gets cleared if argument is missing or null
     *
     * @param {string|null} text - Text to show in the status element
     * @private
     */
    _statusText(text = null) {
      if (text === null) {
        this._statusTextElement.innerText = '';
      } else {
        this._statusTextElement.innerText = text;
      }
    }

    /**
     * Removes the 'invisible' class from the provided element names
     * Elements ids are searched as 'vestec-ELEMENT-row'
     *
     * @param {string} elements - Element(s) to show
     * @private
     */
    _show(...elements) {
      elements.forEach((el) => {
        document.getElementById(`csp-vestec-${el}-row`).classList.remove('invisible');
      });
    }

    /**
     * Adds the 'invisible' class from the provided element names
     * Elements ids are searched as 'vestec-ELEMENT-row'
     *
     * @param {string} elements - Element(s) to hide
     * @private
     */
    _hide(...elements) {
      elements.forEach((el) => {
        document.getElementById(`csp-vestec-${el}-row`).classList.add('invisible');
      });
    }

    /**
     * Throws an error if user is not logged in
     *
     * @throws {Error} If user is not logged in
     * @private
     */
    _checkLogin() {
      if (!this._vestecApi.isAuthorized()) {
        CosmoScout.notifications.print('Not logged in', 'You are not logged in.', 'error');

        throw new Error('You are not logged in into the vestec system.');
      }
    }

    /**
     * Hides the create incident form content if the current user is not logged
     * in
     *
     * @private
     */
    _hideIncidentWindowContent() {
      const window = document.querySelector('#csp-vestec-incident-window');

      window.querySelector('form').classList.add('hidden');
      window.querySelector('p').classList.remove('hidden');
    }

    /**
     * Shows the create incident form content and fills the workflows for the
     * current user
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
     * Fills the create incident workflow dropdown with the registered workflows
     * for the current user Gets automatically called on login
     *
     * @private
     */
    async _fillIncidentWorkflows() {
      const workflows = await this.getWorkflows();

      if (workflows.length === 0) {
        CosmoScout.notifications.print(
            'No Workflows',
            'There are no workflows registered.',
            'warning',
        );

        console.warn('No workflows registered');
        return;
      }

      const workflowSelect = document.getElementById('csp-vestec-incident-workflow');

      $(workflowSelect).selectpicker('destroy');
      CosmoScout.gui.clearHtml(workflowSelect);

      workflows.forEach((workflow) => {
        const option = document.createElement('option');
        option.value = workflow;
        option.text  = workflow;
        workflowSelect.appendChild(option);
      });

      $(workflowSelect).selectpicker();
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

      const response = await this._vestecApi.createIncident({
        name: form.elements.namedItem('csp-vestec-incident-name').value,
        kind: form.elements.namedItem('csp-vestec-incident-workflow').value,
        upperLeftLatlong: form.elements.namedItem('csp-vestec-incident-upper-left').value,
        lowerRightLatlong: form.elements.namedItem('csp-vestec-incident-lower-right').value,
        duration: form.elements.namedItem('csp-vestec-incident-duration').value,
      });

      if (response.status === 201) {
        CosmoScout.notifications.print(
            'Incident created',
            'Successfully created incident.',
            'done',
        );

        form.parentElement.classList.toggle('visible');
        form.reset();
        window.callNative('vestec.removeMarks');
      }

      // TODO Status code currently missing in vestec response
      if (response.status === 400) {
        CosmoScout.notifications.print('Creation failed', response.statusText, 'error');
      }

      return null;
    }

    /**
     * Enable checking if the user is authorized each interval seconds
     *
     * @param {number} interval - Interval in seconds
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

    /**
     * Sets the login inputs to invalid / valid based on argument state
     *
     * @see {_usernameInput}
     * @see {_passwordInput}
     * @param {boolean} valid
     * @private
     */
    _setLoginInputValidity(valid) {
      if (valid) {
        this._usernameInput.classList.add('disabled');
        this._passwordInput.classList.add('disabled');
        this._usernameInput.classList.remove('is-invalid');
        this._passwordInput.classList.remove('is-invalid');
      } else {
        this._usernameInput.classList.remove('disabled');
        this._passwordInput.classList.remove('disabled');
        this._usernameInput.classList.add('is-invalid');
        this._passwordInput.classList.add('is-invalid');
        this._hide('status');
      }
    }
  }

  CosmoScout.init(VestecApi);
})();
