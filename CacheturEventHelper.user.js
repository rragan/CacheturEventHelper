// ==UserScript==
// @name            Cachetur event time helper
// @author          cachetur.no, thomfre, rragan (derived from cachetur assistant)
// @namespace       http://cachetur.no/
// @version         1.0.0
// @description     Script to fill in event start/end times for cachetur
// @match           https://cachetur.no/admin/eventer
// @connect         cachetur.no
// @connect         cachetur.net
// @connect         geocaching.com
// @connect         self
// @grant           GM_xmlhttpRequest
// @grant           unsafeWindow
// @run-at          document-end
// @copyright       2024+, rragan
// @require         https://raw.githubusercontent.com/cghove/GM_config/master/gm_config.js
// @require         https://code.jquery.com/jquery-latest.js
// @require         https://unpkg.com/i18next@21.9.1/i18next.min.js
// @require         https://gist.github.com/raw/2625891/waitForKeyElements.js
// @updateURL       https://github.com/rragan/CacheturEventHelper/raw/main/CacheturEventHelper.meta.js
// @downloadURL     https://github.com/rragan/CacheturEventHelper/raw/main/CacheturEventHelper.user.js
// ==/UserScript==
/* globals jQuery, $, waitForKeyElements, L, i18next, i18nextXHRBackend, i18nextBrowserLanguageDetector, cloneInto, gm_config */

this.$ = this.jQuery = jQuery.noConflict(true);

console.log("Started");

// Get the start/end times from the geocache
function getGC(code) {
    return new Promise((resolve, reject) => {

        var start = "";
        var end = "";

        GM_xmlhttpRequest({
            method: "GET",
            url: "https://www.geocaching.com/geocache/" + code,
            onload: function(response) {
                var str = response.responseText;
                var regexStart = /Start time:\s*(\d{1,2}:\d{2}\s*[APM]{2})/;

                var match = str.match(regexStart);
                if (match) {
                    var startTime = match[1]; // This will contain 'x:xx AM or PM'
                    start = convertTo24HourFormat(startTime);
                } else {
                    console.log('No start match found.');
                }
                var regexEnd = /End time:\s*(\d{1,2}:\d{2}\s*[APM]{2})/;

                var matchEnd = str.match(regexEnd);
                if (matchEnd) {
                    var endTime = matchEnd[1]; // This will contain 'x:xx AM or PM'
                    end = convertTo24HourFormat(endTime);
                } else {
                    console.log('No end match found.');
                }
                var times = [start, end];
                resolve(times);
            },
            onerror: function(response) {
                console.log(response.status);
                console.log(response.statusText);
            }

        });

    });
}

function convertTo24HourFormat(time) {
    const [timePart, modifier] = time.split(' '); // Split the time and modifier (AM/PM)
    let [hours, minutes] = timePart.split(':').map(Number); // Split hours and minutes

    if (modifier === 'PM' && hours !== 12) {
        hours += 12; // Convert PM hours to 24-hour format
    } else if (modifier === 'AM' && hours === 12) {
        hours = 0; // Convert midnight (12 AM) to 0 hours
    }

    // Pad hours and minutes to ensure they are two digits
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return formattedTime;
}

window.onload = function() {
    var listOfTimes = [];
    var listOfCodes = [];

    console.log("Running");
    injectGoButton();
    $("#goButton").click(function() {
        this.style.display = "none"; // Hide button after click
        // Select all button elements with the class 'event-save'
        const buttons = document.querySelectorAll('button.event-save');
        const gcCodes = document.getElementsByName("event_code"); // get all the GC codes
        const starts = document.getElementsByName("event_start"); // Get all start times
        const ends = document.getElementsByName("event_end"); // Get all end times

        // Get array of gc codes
        const getAllCodes = async () => {
            var num = 0;
            for (const theId of gcCodes) {
                var gcId = gcCodes[num].value;
                num++;
                listOfCodes.push(gcId);
            }
        }

        // Function to fetch times for all codes
        async function fetchTimes() {
            const results = [];
            var num = 0;
            for (const theId of gcCodes) {
                try {
                    var gcId = gcCodes[num].value;
                    var times = await getGC(gcId);
                    starts[num].value = times[0];
                    ends[num].value = times[1];
                    num++;
                    results.push({
                        gcId,
                        times
                    });
                } catch (error) {
                    console.error(error);
                }
            }
            return results;
        }

        const clickButtonsInTurn = async () => {
            for (const button of buttons) {
                button.click(); // Simulate a click on the button
                // Delay for some time before clicking the next button
                await new Promise(resolve => setTimeout(resolve, 200)); // 200ms second delay
            }
        };

        // Start clicking buttons
        getAllCodes();
        fetchTimes().then((results) => {
            clickButtonsInTurn();
        }).catch((error) => {
            console.error("Error fetching times:", error);
        });

    });

    function injectGoButton(data) {
        console.log("Injecting button in page");
        // Create the button element
        const button = document.createElement('button');
        button.id = 'goButton';
        button.textContent = 'Update all the Start/End Times'; // Set the button text
        button.style.color = "white";
        button.style["border-radius"] = "10px";
        button.style["background-color"] = "green";
        button.style.margin = "10px";
        button.style.padding = "10px";

        // Find the first div with class 'alert-info'
        const alertInfoDiv = document.querySelector('.alert-info');

        // Check if the alertInfoDiv exists before injecting the button
        if (alertInfoDiv) {
            alertInfoDiv.parentNode.insertBefore(button, alertInfoDiv.nextSibling);
        } else {
            console.log('Element with class "alert-info" not found.');
        }
    }

}

