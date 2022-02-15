/* global CosmoScout, $, D3NE */

/**
 * Texture Upload Node definition
 *
 * @typedef {Object} Node
 * @property {(number|string)} id
 * @property {{
 *   speciesSelect: HTMLSelectElement,
 *   regionSelect: HTMLSelectElement,
 *   diseaseSelect: HTMLSelectElement,
 *   countInput: HTMLInputElement,
 * }} data
 */

class IncidentConfigNode {

  /**
   * Builder method creating incident and dataset select
   *
   * @param {Node} node
   * @returns {Node}
   */
  builder(node) {
    const mosquitoSpecies = new D3NE.Control(
        `<div class="row">
<div class="col-4"><label for="incident_config_node_select_mosquito_${
            node.id}">Species</label></div>
<div class="col-8">
  <select id="incident_config_node_select_mosquito_${node.id}" class="combobox">
    <option value="aegypti">Aegypti</option>
    <option value="albopictus">Albopictus</option>
  </select>
</div></div>`,
        (element, control) => {
          const select = element.querySelector(
              `#incident_config_node_select_mosquito_${node.id}`);
          $(select).selectpicker();

          control.putData('speciesSelect', select);
        },
    );

    const diseaseSelect = new D3NE.Control(
        `<div class="row">
<div class="col-4"><label for="incident_config_node_select_disease_${
            node.id}">Disease</label></div>
<div class="col-8">
  <select id="incident_config_node_select_disease_${node.id}" class="combobox">
    <option value="deng">Dengue</option>
    <option value="zika">Zika</option>
    <option value="chik">Chikungunya </option>
  </select>
</div></div>`,
        (element, control) => {
          const select = element.querySelector(
              `#incident_config_node_select_disease_${node.id}`);
          $(select).selectpicker();

          control.putData('diseaseSelect', select);
        },
    );

    const countInput = new D3NE.Control(
        `<div class="row">
<div class="col-4"><label for="incident_config_node_count_input_${
            node.id}">Sim. count</label></div>
<div class="col-8"><input id="incident_config_node_count_input_${
            node.id}" type="number" min="1" value="200" style="display: block; width: 100%" /></div>
</div>`,
        (element, control) => {
          control.putData('countInput',
                          element.querySelector(
                              `#incident_config_node_count_input_${node.id}`));
        },
    );

    const tileInput = new D3NE.Control(
        `<div class="row">
<div class="col-4"><label for="incident_config_node_tile_input_${
            node.id}">Num. tiles</label></div>
<div class="col-8"><input id="incident_config_node_tile_input_${
            node.id}" type="number" min="1" value="64" style="display: block; width: 100%" /></div>
</div>`,
        (element, control) => {
          control.putData('tileInput',
                          element.querySelector(
                              `#incident_config_node_tile_input_${node.id}`));
        },
    );

    node.addControl(mosquitoSpecies);
    node.addControl(diseaseSelect);
    node.addControl(countInput);
    node.addControl(tileInput);

    const configOutput = new D3NE.Output(
        'Workflow Config', CosmoScout.vestecNE.sockets.INCIDENT_CONFIG)

    node.addOutput(configOutput);

    return node;
  }

  /**
   * @param {Node} node
   * @param {Array} _inputs - Unused
   * @param {Array} outputs - The config
   */
  // species, disease, count, lat_first_point, lon_first_point,
  // lat_second_point, lon_second_point, n_max_tiles): 200, 41, 12, 42, 13, 4
  async worker(node, _inputs, outputs) {

    outputs[0] = {
      species : node.data.speciesSelect.value,
      // region : node.data.regionSelect.value,
      disease : node.data.diseaseSelect.value,
      count : node.data.countInput.value,
      lat_first_point : 50,
      lon_first_point : 13,
      lat_second_point : 53,
      lon_second_point : 14,
      n_max_tiles : node.data.tileInput.value
    };
  }

  /**
   * Component accessor
   *
   * @returns {D3NE.Component}
   * @throws {Error}
   */
  getComponent() {
    this._checkD3NE();

    return new D3NE.Component('IncidentConfigNode', {
      builder : this.builder.bind(this),
      worker : this.worker.bind(this),
    });
  }

  /**
   * Check if D3NE is available
   *
   * @throws {Error}
   * @private
   */
  _checkD3NE() {
    if (typeof D3NE === 'undefined') {
      throw new Error('D3NE is not defined.');
    }
  }
}

(() => {
  const incidentConfigNode = new IncidentConfigNode();

  CosmoScout.vestecNE.addNode('IncidentConfigNode',
                              incidentConfigNode.getComponent());
})();
