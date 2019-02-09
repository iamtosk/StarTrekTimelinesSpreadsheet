import STTApi from 'sttapi';
import { CONFIG } from 'sttapi';

export class ServerImageProvider {
    _baseURLAsset;
    _cachedAssets;
    _serverURL;

    constructor(serverURL) {
        this._serverURL = serverURL;;
        this._baseURLAsset = this._serverURL + 'assets/';

        this._cachedAssets = new Set();

        this.fillCache();
    }

    async fillCache() {
        let assetList = await STTApi.networkHelper.get(this._serverURL + 'asset/list', { dummy: true });
        this._cachedAssets = new Set(assetList);
    }

    formatUrl(url) {
        let imageName = url.replace(new RegExp('/', 'g'), '_') + '.png';
        imageName = imageName.startsWith('_') ? imageName.substr(1) : imageName;

        return imageName;
	}

    getCached(withIcon) {
        if (!withIcon.icon)
            return '';

        if (!withIcon.icon.file)
            return '';

        return this.internalGetCached(withIcon.icon.file);
    }

    internalGetCached(url) {
        if (this._cachedAssets.has(this.formatUrl(url))) {
            return this._baseURLAsset + this.formatUrl(url);
        } else {
            return '';
        }
    }

    getCrewCached(crew, fullBody) {
        return this.internalGetCached(fullBody ? crew.full_body.file : crew.portrait.file);
    }

    getSpriteCached(assetName, spriteName) {
        if (!assetName) {
            return this.internalGetCached(spriteName);
        }

        return this.internalGetCached(((assetName.length > 0) ? (assetName + '_') : '') + spriteName);
    }

    getCrewImageUrl(crew, fullBody, id) {
        return this.getImageUrl(fullBody ? crew.full_body.file : crew.portrait.file, id);
    }

    getShipImageUrl(ship, id) {
        return this.getImageUrl(ship.icon.file, id);
    }

    getItemImageUrl(item, id) {
        return this.getImageUrl(item.icon.file, id);
    }

    getFactionImageUrl(faction, id) {
        return this.getImageUrl(faction.icon.file, id);
    }

    async getSprite(assetName, spriteName, id) {
        let cachedUrl = this.getSpriteCached(assetName, spriteName);
        if (cachedUrl) {
            return { id, url: cachedUrl };
        }

        let assetUrl = await STTApi.networkHelper.get(this._serverURL + 'asset/get', {
            "client_platform": CONFIG.CLIENT_PLATFORM,
            "client_version": CONFIG.CLIENT_VERSION,
            "asset_server": STTApi.serverConfig.config.asset_server,
            "asset_bundle_version": STTApi.serverConfig.config.asset_bundle_version,
            "asset_file": assetName,
            "sprite_name": spriteName
        }, false);

        this._cachedAssets.add(assetUrl);
        return { id, url: this._baseURLAsset + assetUrl };
    }

    async getImageUrl(iconFile, id) {
        let cachedUrl = this.internalGetCached(iconFile);
        if (cachedUrl) {
            return { id, url: cachedUrl };
        }

        let assetUrl = await STTApi.networkHelper.get(this._serverURL + 'asset/get', {
            "client_platform": CONFIG.CLIENT_PLATFORM,
            "client_version": CONFIG.CLIENT_VERSION,
            "asset_server": STTApi.serverConfig.config.asset_server,
            "asset_bundle_version": STTApi.serverConfig.config.asset_bundle_version,
            "asset_file": iconFile
        }, false);

        this._cachedAssets.add(assetUrl);
        return { id, url: this._baseURLAsset + assetUrl };
    }
}