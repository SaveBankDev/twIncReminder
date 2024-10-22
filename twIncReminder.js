/*
* Script Name: Incomings Reminder
* Version: v1.0
* Last Updated: 2024-10-22
* Author: SaveBank
* Author Contact: Discord: savebank 
* Approved: 
* Approved Date: 
* Mod: 
*/

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;


var scriptConfig = {
    scriptData: {
        prefix: 'sbIncR',
        name: 'Inc Reminder',
        version: 'v1.0',
        author: 'SaveBank',
        authorUrl: '',
        helpLink: '',
    },
    translations: {
        en_DK: {
            'Can only be used in the village overview or incoming screen!': 'Can only be used in the village overview or incoming screen!',
            Help: 'Help',
            'Inc Reminder': 'Inc Reminder',

        },
        de_DE: {
            'Can only be used in the village overview or incoming screen!': 'Kann nur im Dorf oder in Eintreffende Befehle verwendet werden!',
            Help: 'Hilfe',
            'Inc Reminder': 'Inc Reminder',

        }
    }
    ,
    allowedMarkets: [],
    allowedScreens: ['overview_villages'],
    allowedModes: [],
    isDebug: DEBUG,
    enableCountApi: false
};



$.getScript(`https://cdn.jsdelivr.net/gh/SaveBankDev/Tribal-Wars-Scripts-SDK@main/twSDK.js`,
    async function () {
        const startTime = performance.now();
        if (DEBUG) {
            console.debug(`Init`);
        }
        await twSDK.init(scriptConfig);
        const scriptInfo = twSDK.scriptInfo();
        const isValidScreen = twSDK.checkValidLocation('screen');
        if (!isValidScreen) {
            UI.ErrorMessage(twSDK.tt('Can only be used in the incoming screen!'));
            return;
        }
        let incDataMap;

        incDataMap = collectIncDataFromOverview();

        if (incDataMap.size === 0) {
            UI.ErrorMessage(twSDK.tt('No incoming attacks found'));
            return;
        }
        if (DEBUG) console.debug(`${scriptInfo}: Startup time: ${(performance.now() - startTime).toFixed(2)} milliseconds`);
        // Entry point
        (async function () {
            try {
                const startTime = performance.now();
                initReminder(incDataMap);
                count();
                if (DEBUG) console.debug(`${scriptInfo}: Time to initialize: ${(performance.now() - startTime).toFixed(2)} milliseconds`);
            } catch (error) {
                UI.ErrorMessage(twSDK.tt('There was an error!'));
                console.error(`${scriptInfo}: Error:`, error);
            }
        })();

        function initReminder(incDataMap) {

        }

        function collectIncDataFromOverview() {
            const startTime = performance.now();
            const incDataMap = new Map();
            try {
                jQuery('#incomings_table tbody tr.nowrap').each((_, incsRow) => {
                    try {
                        const incId = parseInt(jQuery(incsRow).find('span.quickedit').attr('data-id'));
                        const incLabel = jQuery(incsRow).find('span.quickedit-label').text().trim();
                        const commandType = "attack";
                        incDataMap.set(incId, { label: incLabel, commandType: commandType });
                    } catch (innerError) {
                        console.error('Error processing a row:', innerError);
                    }
                });
            } catch (outerError) {
                console.error('Error processing the table:', outerError);
            }
            if (DEBUG) console.debug(`${scriptInfo}: incDataMap: `, incDataMap);
            if (DEBUG) console.debug(`${scriptInfo}: Time to collect inc data: ${(performance.now() - startTime).toFixed(2)} milliseconds`);
            return incDataMap;
        }

        function count() {
            const apiUrl = 'https://api.counterapi.dev/v1';
            const playerId = game_data.player.id;
            const encodedPlayerId = btoa(game_data.player.id);
            const apiKey = 'sbIncReminder'; // api key
            const namespace = 'savebankscriptstw'; // namespace
            try {
                $.getJSON(`${apiUrl}/${namespace}/${apiKey}/up`, response => {
                    if (DEBUG) console.debug(`Total script runs: ${response.count}`);
                }).fail(() => { if (DEBUG) console.debug("Failed to fetch total script runs"); });
            } catch (error) { if (DEBUG) console.debug("Error fetching total script runs: ", error); }

            try {
                $.getJSON(`${apiUrl}/${namespace}/${apiKey}_id${encodedPlayerId}/up`, response => {
                    if (response.count === 1) {
                        $.getJSON(`${apiUrl}/${namespace}/${apiKey}_users/up`).fail(() => {
                            if (DEBUG) console.debug("Failed to increment user count");
                        });
                    }
                    if (DEBUG) console.debug(`Player ${playerId} script runs: ${response.count}`);
                }).fail(() => { if (DEBUG) console.debug("Failed to fetch player script runs"); });
            } catch (error) { if (DEBUG) console.debug("Error fetching player script runs: ", error); }

            try {
                $.getJSON(`${apiUrl}/${namespace}/${apiKey}_users`, response => {
                    if (DEBUG) console.debug(`Total users: ${response.count}`);
                }).fail(() => { if (DEBUG) console.debug("Failed to fetch total users"); });
            } catch (error) { if (DEBUG) console.debug("Error fetching total users: ", error); }
        }

        function getLocalStorage() {
            const localStorageSettings = JSON.parse(localStorage.getItem('sbIncReminder'));
            // Check if all expected settings are in localStorageSettings
            const expectedSettings = [

            ];

            let missingSettings = [];
            if (localStorageSettings) {
                missingSettings = expectedSettings.filter(setting => !(setting in localStorageSettings));
                if (DEBUG && missingSettings.length > 0) console.debug(`${scriptInfo}: Missing settings in localStorage: `, missingSettings);
            }

            if (localStorageSettings && missingSettings.length === 0) {
                // If settings exist in localStorage  return the object
                return localStorageSettings;
            } else {
                const defaultSettings = {

                };

                saveLocalStorage(defaultSettings);

                return defaultSettings;
            }
        }
        function saveLocalStorage(settingsObject) {
            // Stringify and save the settings object
            localStorage.setItem('sbIncReminder', JSON.stringify(settingsObject));
        }
    });

