/*
* Script Name: Incomings Alarm
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
if (typeof FILTER !== 'string') FILTER = '';
if (typeof ALARM_IN_SECONDS !== 'number') ALARM_IN_SECONDS = 30;


var scriptConfig = {
    scriptData: {
        prefix: 'sbIncA',
        name: 'Inc Alarm',
        version: 'v1.0',
        author: 'SaveBank',
        authorUrl: 'https://forum.tribalwars.net/index.php?members/savebank.131111/',
        helpLink: '',
    },
    translations: {
        en_DK: {
            'Can only be used in the incoming attacks screen!': 'Can only be used in the incoming attacks screen!',
            Help: 'Help',
            'Inc Alarm': 'Inc Alarm',

        },
        de_DE: {
            'Can only be used in the incoming attacks screen!': 'Kann nur in Eintreffende Befehle verwendet werden!',
            Help: 'Hilfe',
            'Inc Alarm': 'Inc Wecker',
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
        
        const urlParams = new URLSearchParams(window.location.search);
        const screen = urlParams.get('screen');
        const mode = urlParams.get('mode');
        const subtype = urlParams.get('subtype');
        if (!(screen === 'overview_villages' && mode === 'incomings' && subtype === 'attacks')) {
            UI.ErrorMessage(twSDK.tt('Can only be used in the incoming attacks screen!'));
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
            // Cache filtered incDataMap based on FILTER and commandType
            let filteredIncDataMap = new Map();
            if (FILTER === "") {
                for (let [key, value] of incDataMap) {
                    if (value.commandType === "attack") {
                        filteredIncDataMap.set(key, value);
                    }
                }
            } else {
                for (let [key, value] of incDataMap) {
                    if (value.commandType === "attack" && value.label.includes(FILTER)) {
                        filteredIncDataMap.set(key, value);
                    }
                }
            }
        
            jQuery(window.TribalWars).on('global_tick', function () {
                const startTime = performance.now();
        
                let nextIncTime = null;
                jQuery('#incomings_table tbody tr.nowrap').each((_, incsRow) => {
                    const incId = parseInt(jQuery(incsRow).find('span.quickedit').attr('data-id'));
                    if (filteredIncDataMap.has(incId)) {
                        // Find the seventh td in the row
                        const seventhTd = jQuery(incsRow).find('td').eq(6);
                        if (seventhTd.length === 0) {
                            throw new Error(`Seventh td not found for incId ${incId}`);
                        }
                        // Find the span within the seventh td
                        const remainingTimeSpan = seventhTd.find('span');
                        if (remainingTimeSpan.length === 0) {
                            throw new Error(`Remaining time span not found for incId ${incId}`);
                        }
                        // Extract the remaining time
                        const remainingTime = remainingTimeSpan.text().trim();
                        if (DEBUG) console.debug(`${scriptInfo}: Remaining time for incId ${incId}: ${remainingTime}`);
        
                        // Convert hh:mm:ss to seconds
                        const timeParts = remainingTime.split(':');
                        const hours = parseInt(timeParts[0], 10);
                        const minutes = parseInt(timeParts[1], 10);
                        const seconds = parseInt(timeParts[2], 10);
                        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        
                        nextIncTime = {
                            formatted: remainingTime,
                            totalSeconds: totalSeconds
                        };
                        return false; // Break the loop once the first matching incId is found
                    }
                });
        
                if (DEBUG) console.debug(`${scriptInfo}: Time to get nextIncTime: ${(performance.now() - startTime).toFixed(2)} milliseconds`);
        
                const alarmTimes = [ALARM_IN_SECONDS - 1, ALARM_IN_SECONDS, ALARM_IN_SECONDS + 1].filter(time => time > 0);
                if (nextIncTime && alarmTimes.includes(nextIncTime.totalSeconds)) {
                    TribalWars.playSound('chat');
                }
        
                document.title = nextIncTime ? `${nextIncTime.formatted}` : 'No attacks';
            });
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
            const apiKey = 'sbIncAlarm'; // api key
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
    });

