/* global IApi, CosmoScout, $ */

(() => {
    class VestecApi extends IApi {
        /**
         * @inheritDoc
         */
        name = 'vestec';

        /**
         * @inheritDoc
         */
        init() {
            console.log("Init VESTEC plugin in javascript done");
            document.getElementById('vestec-system').setAttribute('src', 'http://vestec.epcc.ed.ac.uk/')
        }
    }

    CosmoScout.init(VestecApi);
})();