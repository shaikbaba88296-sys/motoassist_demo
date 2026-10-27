// Local Datasets
const LOCAL_DATASETS = {
    "AP09XX1234": {
        customer_name: "Ravi Kumar",
        vehicle_no: "AP09XX1234",
        issue_part: "Front Brake Pad worn out",
        issue_cost: 450,
        base_bill: 1200,
        current_bill: 1200,
        eta: "05:00 PM",
        issue_status: "pending"
    },
    "AP21BC5678": {
        customer_name: "Suresh Reddy",
        vehicle_no: "AP21BC5678",
        issue_part: "Engine Oil Leak & Clutch Plate",
        issue_cost: 1800,
        base_bill: 2500,
        current_bill: 2500,
        eta: "06:30 PM",
        issue_status: "pending"
    },
    "TS07EF9999": {
        customer_name: "Praveen Kumar",
        vehicle_no: "TS07EF9999",
        issue_part: "Exide Battery Replacement",
        issue_cost: 1250,
        base_bill: 850,
        current_bill: 850,
        eta: "04:00 PM",
        issue_status: "pending"
    },
    "AP39AZ4321": {
        customer_name: "Mahesh Naidu",
        vehicle_no: "AP39AZ4321",
        issue_part: "Chain Sprocket Replacement",
        issue_cost: 1200,
        base_bill: 1500,
        current_bill: 2700,
        eta: "05:15 PM",
        issue_status: "approved"
    },
    "KA04MK7711": {
        customer_name: "Rajesh Varma",
        vehicle_no: "KA04MK7711",
        issue_part: "Routine Periodic Checkup (No Issues)",
        issue_cost: 0,
        base_bill: 950,
        current_bill: 950,
        eta: "04:30 PM",
        issue_status: "approved"
    },
    "TN09ZZ3344": {
        customer_name: "Anitha Rao",
        vehicle_no: "TN09ZZ3344",
        issue_part: "Rear Tyre Tube Replacement",
        issue_cost: 600,
        base_bill: 1100,
        current_bill: 1100,
        eta: "05:45 PM",
        issue_status: "rejected"
    }
};

let recognition = null;
let synth = window.speechSynthesis;
let isCalling = false;
let currentActiveJob = LOCAL_DATASETS["AP09XX1234"];

// DOM elements
const vehicleSelect = document.getElementById("vehicle-select");
const btnCallTrigger = document.getElementById("btn-call-trigger");
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const userTranscript = document.getElementById("user-transcript");
const botResponse = document.getElementById("bot-response");
const callStateBadge = document.getElementById("call-state-badge");

const jobStatusPill = document.getElementById("job-status-pill");
const lblCustName = document.getElementById("lbl-cust-name");
const lblVehNo = document.getElementById("lbl-veh-no");
const lblIssue = document.getElementById("lbl-issue");
const lblIssueCost = document.getElementById("lbl-issue-cost");
const lblBaseBill = document.getElementById("lbl-base-bill");
const lblTotalBill = document.getElementById("lbl-total-bill");
const lblEta = document.getElementById("lbl-eta");

const btnApprove = document.getElementById("btn-approve");
const btnReject = document.getElementById("btn-reject");
const btnPrintInvoice = document.getElementById("btn-print-invoice");

// Mobile Audio Unlock
function unlockMobileAudio() {
    if (synth && synth.paused) synth.resume();
    // Warm up audio buffer
    const silent = new SpeechSynthesisUtterance("");
    synth.speak(silent);
}

// Render Data to Card
function renderJobData(data) {
    currentActiveJob = Object.assign({}, data);
    lblCustName.textContent = data.customer_name;
    lblVehNo.textContent = data.vehicle_no;
    lblIssue.textContent = data.issue_part;
    lblIssueCost.textContent = data.issue_cost;
    lblBaseBill.textContent = data.base_bill;
    lblTotalBill.textContent = data.current_bill;
    lblEta.textContent = data.eta;

    updateBadgeStatus(data.issue_status);
}

function updateBadgeStatus(status) {
    if (status === "approved") {
        jobStatusPill.textContent = "Customer Approved";
        jobStatusPill.className = "pill-approved";
    } else if (status === "rejected") {
        jobStatusPill.textContent = "Customer Declined";
        jobStatusPill.className = "pill-rejected";
    } else {
        jobStatusPill.textContent = "Pending Authorization";
        jobStatusPill.className = "pill-pending";
    }
}

function loadVehicleData(vehicleNo, autoStartCall = false) {
    if (LOCAL_DATASETS[vehicleNo]) {
        renderJobData(LOCAL_DATASETS[vehicleNo]);
    }
    if (autoStartCall) {
        startVoiceDesk();
    }
}

// 100% Reliable Human-like Speech Engine
function speakVoice(teluguScript, spokenText) {
    botResponse.textContent = teluguScript;
    if (!synth) return;

    try {
        synth.cancel();
        if (synth.paused) synth.resume();

        const utterance = new SpeechSynthesisUtterance(spokenText);
        
        // Find best Indian/Telugu voice available
        const voices = synth.getVoices();
        const indianVoice = voices.find(v => v.lang.includes("te") || v.lang.includes("en-IN") || v.lang.includes("hi-IN"));
        if (indianVoice) {
            utterance.voice = indianVoice;
        }

        utterance.rate = 0.92;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
            if (isCalling && recognition) {
                try { recognition.start(); } catch(e) {}
            }
        };

        utterance.onerror = (e) => {
            console.warn("Speech synthesis notice:", e);
            if (isCalling && recognition) {
                try { recognition.start(); } catch(err) {}
            }
        };

        synth.speak(utterance);
    } catch (err) {
        console.error("Speech error:", err);
    }
}

// Speech Recognition
function setupSpeechRecognition() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Prevents mobile mic loop freeze
        recognition.interimResults = false;
        recognition.lang = "te-IN"; // Mixed Telugu Speech

        recognition.onstart = () => {
            callStateBadge.textContent = "Call Active (Listening)";
            callStateBadge.className = "state-live";
        };

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript.trim().toLowerCase();
            userTranscript.textContent = text;
            evaluateDecision(text);
        };

        recognition.onerror = () => {
            callStateBadge.textContent = "Listening... (Speak now)";
        };

        recognition.onend = () => {
            if (isCalling) {
                setTimeout(() => {
                    try { recognition.start(); } catch(e) {}
                }, 400);
            }
        };
    }
}

// Start Call Logic
function startVoiceDesk() {
    unlockMobileAudio();
    isCalling = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    callStateBadge.textContent = "Call Connected (Speaking)";
    callStateBadge.className = "state-live";

    setupSpeechRecognition();

    const job = currentActiveJob;
    const teluguText = `నమస్కారం ${job.customer_name} గారు! మీ బండి ${job.vehicle_no} లో ${job.issue_part} సమస్య ఉంది. ఖర్చు ₹${job.issue_cost} అవుతుంది. మీరు దీనికి అంగీకరిస్తారా?`;
    const spokenVoice = `Namaskaram ${job.customer_name} garu! Mee bandi ${job.vehicle_no} lo ${job.issue_part} problem undi. Repair cost ${job.issue_cost} rupees avuthundi. Meeru deeniki approve chesthaara?`;

    // Speak announcement immediately
    speakVoice(teluguText, spokenVoice);
}

function stopVoiceDesk() {
    isCalling = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    callStateBadge.textContent = "Call Ended";
