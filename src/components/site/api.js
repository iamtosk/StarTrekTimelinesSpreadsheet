import STTApi from 'sttapi';

class STTToolsClass {
    get assetProvider() {
        return STTApi.imageProvider;
    }

    get allcrew() {
        return this._allcrew;
    }

    get archetypeCache() {
        return this._archetypeCache;
    }

    get platformConfigCache() {
        return this._platformConfigCache;
    }

    get configCache() {
        return this._configCache;
    }

    get cryoCollectionsCache() {
        return this._cryoCollectionsCache;
    }

    get missionsCache() {
        return this._missionsCache;
    }

    async initialize() {
        return Promise.all([
            this.fetchAllCrew(),
            this.fetchArchetypeCache(),
            this.fetchPlatformConfigCache(),
            this.fetchConfigCache(),
            this.fetchCryoCollectionsCache(),
            this.fetchMissionCache()
        ]).then(() => {
            // Fix trait names
            this.allcrew.forEach(crew => {
                crew.traits_named = crew.traits.map(trait => this.platformConfigCache.config.trait_names[trait]);
            });
        });
    }

    async fetchArchetypeCache() {
        let response = await window.fetch(STTApi.serverAddress + 'archetype_cache.json');

        if (!response.ok) {
            let data = await response.text();
            throw new Error(`Network error; status ${response.status}; reply ${data}.`);
        }

        this._archetypeCache = await response.json();
    }

    async fetchPlatformConfigCache() {
        let response = await window.fetch(STTApi.serverAddress + 'config_cache.json');

        if (!response.ok) {
            let data = await response.text();
            throw new Error(`Network error; status ${response.status}; reply ${data}.`);
        }

        this._platformConfigCache = await response.json();
    }

    async fetchConfigCache() {
        let response = await window.fetch(STTApi.serverAddress + 'config2_cache.json');

        if (!response.ok) {
            let data = await response.text();
            throw new Error(`Network error; status ${response.status}; reply ${data}.`);
        }

        this._configCache = await response.json();
    }

    async fetchMissionCache() {
        let response = await window.fetch(STTApi.serverAddress + 'missions_cache.json');

        if (!response.ok) {
            let data = await response.text();
            throw new Error(`Network error; status ${response.status}; reply ${data}.`);
        }

        this._missionsCache = await response.json();
    }

    async fetchCryoCollectionsCache() {
        let response = await window.fetch(STTApi.serverAddress + 'cryo_collections_cache.json');

        if (!response.ok) {
            let data = await response.text();
            throw new Error(`Network error; status ${response.status}; reply ${data}.`);
        }

        this._cryoCollectionsCache = await response.json();
    }

    async fetchAllCrew() {

        let allcrewRaw = [];

        let roster = [];
        let dupeChecker = new Set();
        allcrewRaw.forEach(crew => {
            // Sometimes duplicates can sneak into our allcrew list, filter them out
            if (dupeChecker.has(crew.symbol)) {
                return;
            }

            dupeChecker.add(crew.symbol);

            roster.push(crew);
        });

        this._allcrew = roster;
    }
}

let STTTools = new STTToolsClass();
export default STTTools;