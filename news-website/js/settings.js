function initSettings() {
    const settings = {
        theme: localStorage.getItem('newsTheme') || 'light',
        fontSize: localStorage.getItem('newsFontSize') || 'medium',
        layout: localStorage.getItem('newsLayout') || 'list',
        autoRefresh: localStorage.getItem('newsAutoRefresh') === 'true',
        refreshInterval: parseInt(localStorage.getItem('newsRefreshInterval')) || 5
    };

    function applySettings() {
        document.documentElement.setAttribute('data-theme', settings.theme);
        document.documentElement.setAttribute('data-font-size', settings.fontSize);
    }

    function saveSettings(newSettings) {
        if (newSettings.theme) {
            settings.theme = newSettings.theme;
            localStorage.setItem('newsTheme', newSettings.theme);
        }
        if (newSettings.fontSize) {
            settings.fontSize = newSettings.fontSize;
            localStorage.setItem('newsFontSize', newSettings.fontSize);
        }
        if (newSettings.layout) {
            settings.layout = newSettings.layout;
            localStorage.setItem('newsLayout', newSettings.layout);
        }
        if (newSettings.autoRefresh !== undefined) {
            settings.autoRefresh = newSettings.autoRefresh;
            localStorage.setItem('newsAutoRefresh', newSettings.autoRefresh);
        }
        if (newSettings.refreshInterval) {
            settings.refreshInterval = newSettings.refreshInterval;
            localStorage.setItem('newsRefreshInterval', newSettings.refreshInterval);
        }
        applySettings();
    }

    function getSettings() {
        return { ...settings };
    }

    applySettings();

    return {
        saveSettings,
        getSettings
    };
}