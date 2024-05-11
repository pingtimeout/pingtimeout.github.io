const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const trainers = [
    'Benoit', 'Clem', 'Fred N', 'Jean Yves', 'Laura', 'Marine',
    'Muriel', 'Olivier L', 'Olivier P', 'Pierre', 'Sylvie R', 'Virginie',
];
const activities = [
    'Canicross',
    'Dog Dancing',
    'Hooper',
    'Accueil',
    'Cani Balade',
    'Orange',
    'Rouge',
    'Vert',
    'Blanc',
    'Bleu',
    'Chiots',
];
const activityBitmasks = makeActivityBitmasks();

function bigintToBase62(num) {
    let result = '';
    while (num > 0) {
        result = BASE62[num % 62n] + result;
        num /= 62n;
    }
    return result || '0';
}

function base62ToBigInt(str) {
    let result = BigInt(0);
    for (let i = 0; i < str.length; i++) {
        result = result * 62n + BigInt(BASE62.indexOf(str[i]));
    }
    return result;
}

function initTrainerActivityForm() {
    const form = document.getElementById('trainer-activity-form');
    trainers.forEach(trainer => {
        const section = document.createElement('div');
        section.className = 'trainer-section';
        const nameLabel = document.createElement('label');
        nameLabel.textContent = trainer + ': ';
        section.appendChild(nameLabel);
        const select = document.createElement('select');
        select.multiple = true;
        select.id = trainer.toLowerCase().replace(/\s+/g, '-');
        select.onchange = () => updateRecap();
        activities.forEach(activity => {
            const option = document.createElement('option');
            option.value = activity;
            option.textContent = activity;
            select.appendChild(option);
        });
        section.appendChild(select);
        form.appendChild(section);
    });
    var elemsSelect = document.querySelectorAll('select');
    M.FormSelect.init(elemsSelect);
}

function initWhatsAppShareAction() {
    document.getElementById('shareWhatsApp').addEventListener('click', function() {
        const trainersSummaryPrefix = document.getElementById('trainers-prefix').textContent;
        const trainersSummaryList = document.getElementById('trainers-summary');
        const trainersAsText = Array.from(trainersSummaryList.querySelectorAll('li')).map(li => `- ${li.textContent}`).join('\n');
        const activitiesSummaryPrefix = document.getElementById('activities-prefix').textContent;
        const activitiesSummaryList = document.getElementById('activities-summary');
        const activitiesAsText = Array.from(activitiesSummaryList.querySelectorAll('li')).map(li => `- ${li.textContent}`).join('\n');
        const linkToOrga = document.getElementById('link-to-orga').href;
        let summary = "";
        summary += `${trainersSummaryPrefix}\n\n${trainersAsText}\n\n`;
        summary += `${activitiesSummaryPrefix}\n\n${activitiesAsText}\n\n`;
        summary += `${linkToOrga}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`;
        window.open(whatsappUrl, '_blank');
    });
}

function makeActivityBitmasks() {
    const activityBitmasks = {};
    activities.forEach((activity, index) => {
        activityBitmasks[activity] = 1 << index;
    });
    return activityBitmasks;
}

function encodeTrainerActivities() {
    let fullBitmask = BigInt(0);  // Use BigInt for large bitmask operations
    let shiftAmount = 0;
    trainers.slice().reverse().forEach(trainer => {
        let bitmask = BigInt(0);
        const selectElement = document.getElementById(trainer.toLowerCase().replace(/\s+/g, '-')) || [];
        const selectedActivities = Array.from(selectElement.selectedOptions).map(option => option.value);
        selectedActivities.forEach(activity => {
            bitmask |= BigInt(activityBitmasks[activity]);
        });
        fullBitmask |= (bitmask << BigInt(shiftAmount));
        shiftAmount += 11;
    });
    return bigintToBase62(fullBitmask); // Convert to Base62
}

function updateRecap() {
    const trainerSummaryList = document.getElementById('trainers-summary');
    trainerSummaryList.innerHTML = '';
    trainers.forEach(trainer => {
        const selectId = trainer.toLowerCase().replace(/\s+/g, '-');
        const select = document.getElementById(selectId);
        const selectedActivities = Array.from(select.selectedOptions).map(option => option.value);
        if (selectedActivities.length > 0) {
            const li = document.createElement('li');
            li.textContent = `${trainer}: ${selectedActivities.join(', ')}`;
            trainerSummaryList.appendChild(li);
        }
    });

    const activityToTrainers = {};
    activities.forEach(activity => {
        activityToTrainers[activity] = []; // Initialize every activity with an empty array
    });
    trainers.forEach(trainer => {
        const selectId = trainer.toLowerCase().replace(/\s+/g, '-');
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            Array.from(selectElement.selectedOptions).forEach(option => {
                activityToTrainers[option.value].push(trainer);
            });
        }
    });
    const activitySummaryList = document.getElementById('activities-summary');
    activitySummaryList.innerHTML = '';
    activities.forEach(activity => { // Iterate over all activities to create the list
        if(activityToTrainers[activity].length !== 0) {
            const li = document.createElement('li');
            li.textContent = `${activity} (${activityToTrainers[activity].length}): ${activityToTrainers[activity].join(', ')}`;
            activitySummaryList.appendChild(li);
        }
    });

    // Append a new line and hyperlink with encoded activities
    const encodedActivities = encodeTrainerActivities();
    const currentUrl = window.location.href.split('?')[0]; // Removes any existing query parameters
    const newUrl = `${currentUrl}?orga=${encodedActivities}`;
    document.getElementById("link-to-orga").href = newUrl;
}

function decodeAndInitializeDropdowns() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedActivities = urlParams.get('orga');
    if (!encodedActivities) {
        console.log('No encoded activities data found in URL.');
        return;
    }

    let fullBitmask = base62ToBigInt(encodedActivities); // Decode from Base62

    let shiftAmount = 0;
    trainers.slice().reverse().forEach(trainer => {
        const bitmask = (fullBitmask >> BigInt(shiftAmount)) & ((BigInt(1) << BigInt(11)) - BigInt(1));
        const selectElement = document.getElementById(trainer.toLowerCase().replace(/\s+/g, '-'));
        if (selectElement) {
            Array.from(selectElement.options).forEach(option => {
                option.selected = (bitmask & BigInt(activityBitmasks[option.value])) !== BigInt(0);
            });
            M.FormSelect.init(selectElement);
        }
        shiftAmount += 11;
    });

    updateRecap(); // Optionally update the recap to reflect these pre-set values
}

document.addEventListener('DOMContentLoaded', function() {
    M.FormSelect.init(document.querySelectorAll('select'));
    initTrainerActivityForm();
    initWhatsAppShareAction();
    decodeAndInitializeDropdowns();
});
