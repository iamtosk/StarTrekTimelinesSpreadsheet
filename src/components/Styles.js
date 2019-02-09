import { loadTheme } from '@uifabric/styling';

class UserStoreClass {
    _data;
    constructor() {
        this._data = new Map();
    }

    set(key, item) {
        this._data.set(key, item);
    }

    get(key) {
        return this._data.get(key);
    }
}

let UserStore = new UserStoreClass();
export default UserStore;

export function loadUITheme(dark) {
    const darkThemePalette = {
        "themePrimary": "#0078d7",
        "themeLighterAlt": "#00080f",
        "themeLighter": "#001527",
        "themeLight": "#00335d",
        "themeTertiary": "#0058a1",
        "themeSecondary": "#0071cd",
        "themeDarkAlt": "#0086f4",
        "themeDark": "#42aaff",
        "themeDarker": "#5cb6ff",
        "neutralLighterAlt": "#001222",
        "neutralLighter": "#001d36",
        "neutralLight": "#002d55",
        "neutralQuaternaryAlt": "#003868",
        "neutralQuaternary": "#004078",
        "neutralTertiaryAlt": "#0063ba",
        "neutralTertiary": "#dee1e4",
        "neutralSecondary": "#e3e6e8",
        "neutralPrimaryAlt": "#e9ebed",
        "neutralPrimary": "#ced3d7",
        "neutralDark": "#f4f5f6",
        "black": "#f9fafa",
        "white": "#00070d",
        "primaryBackground": "#00070d",
        "primaryText": "#ced3d7",
        "bodyBackground": "#00070d",
        "bodyText": "#ced3d7",
        "disabledBackground": "#001d36",
        "disabledText": "#0063ba"
    };

    const lightThemePalette = {
        "themePrimary": "#0078d7",
        "themeLighterAlt": "#eff6fc",
        "themeLighter": "#deecf9",
        "themeLight": "#c7e0f4",
        "themeTertiary": "#71afe5",
        "themeSecondary": "#2b88d8",
        "themeDarkAlt": "#106ebe",
        "themeDark": "#005a9e",
        "themeDarker": "#004578",
        "neutralLighterAlt": "#f8f8f8",
        "neutralLighter": "#f4f4f4",
        "neutralLight": "#eaeaea",
        "neutralQuaternaryAlt": "#dadada",
        "neutralQuaternary": "#d0d0d0",
        "neutralTertiaryAlt": "#c8c8c8",
        "neutralTertiary": "#a6a6a6",
        "neutralSecondary": "#666666",
        "neutralPrimaryAlt": "#3c3c3c",
        "neutralPrimary": "#333",
        "neutralDark": "#212121",
        "black": "#1c1c1c",
        "white": "#fff",
        "primaryBackground": "#fff",
        "primaryText": "#333",
        "bodyBackground": "#fff",
        "bodyText": "#333",
        "disabledBackground": "#f4f4f4",
        "disabledText": "#c8c8c8"
    };

    let theme;
    if (dark) {
        theme = loadTheme({ palette: darkThemePalette });
    } else {
        theme = loadTheme({ palette: lightThemePalette });
    }

    UserStore.set('theme', theme);

    return theme;
}
