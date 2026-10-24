let recognition = null;
let synth = window.speechSynthesis;
let isCalling = false;

// DOM Elements
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

let currentActiveJob = null;

function getSelectedVehicle() {
    return vehicleSelect ? vehicleSelect.value : "AP09XX1234";
}

// 1. Fetch Vehicle Status and Update UI
function loadVehicleData(vehicleNo, autoInitiateCall = false) {
    fetch(`/api/status?vehicle_no=${vehicleNo}`)
        .then(res => res.json())
        .then(data => {
            currentActiveJob = data;
            lblCustName.textContent = data.customer_name;
            lblVehNo.textContent = data.vehicle_no;
            lblIssue.textContent = data.issue_part;
            lblIssueCost.textContent = data.issue_cost;
            lblBaseBill.textContent = data.base_bill;
            lblTotalBill.textContent = data.current_bill;
            lblEta.textContent = data.eta;

            if (data.issue_status === "approved") {
                jobStatusPill.textContent = "Approved";
                jobStatusPill.className = "pill-approved";
            } else if (data.issue_status === "rejected") {
                jobStatusPill.textContent = "Declined";
                jobStatusPill.className = "pill-rejected";
            } else {
                jobStatusPill.textContent = "Pending Authorization";
                jobStatusPill.className = "pill-pending";
            }

            if (autoInitiateCall) {
                startVoiceDesk();
            }
        })
        .catch(err => console.error("Data error:", err));
}

// 2. Speech Recognition Setup
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "te-IN"; // Telugu Speech Recognition

    recognition.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        userTranscript.textContent = text;
        evaluateCustomerDecision(text);
    };

    recognition.onerror = () => {
        callStateBadge.textContent = "Listening... (Telugu lo matladandi)";
    };

    recognition.onend = () => {
        if (isCalling) {
            try { recognition.start(); } catch(e) {}
        }
    };
}

// 3. Natural Human Telugu Voice Synthesis
function speakVoice(teluguScript, phoneticsAudio, callback) {
    botResponse.textContent = teluguScript;
    if (!synth) { if (callback) callback(); return; }

    try {
        synth.cancel();
        if (synth.paused) synth.resume();

        const utterance = new SpeechSynthesisUtterance(phoneticsAudio);
        utterance.lang = "en-IN";
        utterance.rate = 0.92;
        utterance.volume = 1.0;

        let called = false;
        const complete = () => {
            if (!called) {
                called = true;
                if (callback) callback();
            }
        };

        utterance.onend = complete;
        utterance.onerror = complete;
        synth.speak(utterance);
        setTimeout(complete, 4500);
    } catch (e) {
        if (callback) callback();
    }
}

// 4. Start Call & Announce Immediate Vehicle Diagnosis
function startVoiceDesk() {
    isCalling = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    callStateBadge.textContent = "Call Connected (Active)";
    callStateBadge.className = "state-live";

    if (synth && synth.paused) synth.resume();
    if (recognition) {
        try { recognition.start(); } catch(e) {}
    }

    if (!currentActiveJob) return;

    // Direct announcement of vehicle issue & asking for approval
    const displayMsg = `నమస్కారం ${currentActiveJob.customer_name} గారు! మీ బండి ${currentActiveJob.vehicle_no} లో ${currentActiveJob.issue_part} పాడైంది. దీనికి అదనంగా ₹${currentActiveJob.issue_cost} అవుతుంది. మీరు దీనికి ఆమోదిస్తారా?`;
    const voiceMsg = `Namaskaram ${currentActiveJob.customer_name} garu! Mee bandi ${currentActiveJob.vehicle_no} lo ${currentActiveJob.issue_part} problem undi. Replacement cost ${currentActiveJob.issue_cost} rupayalu avuthundi. Meeru approve chesthaara?`;

    speakVoice(displayMsg, voiceMsg);
}

function stopVoiceDesk() {
    isCalling = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    callStateBadge.textContent = "Call Ended";
    callStateBadge.className = "state-idle";
    if (recognition) try { recognition.stop(); } catch(e) {}
    if (synth) synth.cancel();
}

// 5. Evaluate Decision from Speech
function evaluateCustomerDecision(text) {
    const approveTerms = ["approve", "చేయండి", "మార్చండి", "సరే", "ఓకే", "okay", "yes", "చెయ్", "హా", "ok"];
    const rejectTerms = ["వద్దు", "vaddu", "oddu", "no", "reject", "వద్దులే", "క్యాన్సల్"];

    if (approveTerms.some(t => text.includes(t))) {
        processDecision("approved", text);
    } else if (rejectTerms.some(t => text.includes(t))) {
        processDecision("rejected", text);
    } else {
        const telugu = `మీ బండి ${currentActiveJob.issue_part} రిపేర్ చేయమంటారా? అవును లేదా వద్దు అని చెప్పండి.`;
        const voice = `Mee bandi ${currentActiveJob.issue_part} repair approve chesthara? Yes leda vaddu ani cheppandi.`;
        speakVoice(telugu, voice);
    }
}

// 6. Process Decision API
function processDecision(decision, rawText = "") {
    fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            vehicle_no: getSelectedVehicle(),
            decision: decision
        })
    })
    .then(res => res.json())
    .then(data => {
        lblTotalBill.textContent = data.new_bill;
        lblEta.textContent = data.eta;

        let display = "";
        let audio = "";

        if (decision === "approved") {
            jobStatusPill.textContent = "Customer Approved";
            jobStatusPill.className = "pill-approved";
            display = `ధన్యవాదాలు! మీ ఆమోదం నమోదయింది. మొత్తం బిల్లు ₹${data.new_bill}. జాబ్ షీట్ లేదా రసీదు ప్రింట్ తీసుకోవచ్చు.`;
            audio = `Dhanyavaadaalu! Approval confirm ayindi. Total bill ${data.new_bill} rupayalu. Delivery time ${data.eta}.`;
        } else {
            jobStatusPill.textContent = "Customer Declined";
            jobStatusPill.className = "pill-rejected";
            display = `సరేనండి, అదనపు భాగం మార్చడం రద్దు చేయబడింది. ప్రాథమిక సర్వీస్ బిల్లు మాత్రమే ఉంటుంది. రసీదు ప్రింట్ తీసుకోండి.`;
            audio = `Sare nandi, additional repair cancel chesamu. Normal service bill mathrame untundi.`;
        }

        speakVoice(display, audio);
    });
}

// 7. Printable Invoice Generation
function prepareAndPrintInvoice() {
    if (!currentActiveJob) return;

    document.getElementById("print-date").textContent = new Date().toLocaleString();
    document.getElementById("print-veh-no").textContent = currentActiveJob.vehicle_no;
    document.getElementById("print-cust-name").textContent = currentActiveJob.customer_name;
    document.getElementById("print-base-bill").textContent = `₹${currentActiveJob.base_bill}`;
    document.getElementById("print-issue-desc").textContent = `${currentActiveJob.issue_part} (Diagnostic Alert)`;
    document.getElementById("print-eta").textContent = lblEta.textContent;

    const currentStatus = jobStatusPill.textContent;
    document.getElementById("print-decision").textContent = currentStatus;

    if (currentStatus.includes("Approved")) {
        document.getElementById("print-part-status").textContent = "Approved by Customer";
        document.getElementById("print-issue-cost").textContent = `₹${currentActiveJob.issue_cost}`;
        document.getElementById("print-final-total").textContent = `₹${lblTotalBill.textContent}`;
    } else {
        document.getElementById("print-part-status").textContent = "Declined by Customer";
        document.getElementById("print-issue-cost").textContent = "₹0 (Declined)";
        document.getElementById("print-final-total").textContent = `₹${currentActiveJob.base_bill}`;
    }

    window.print();
}

// Event Listeners
vehicleSelect.addEventListener("change", () => {
    loadVehicleData(getSelectedVehicle(), true);
});

btnCallTrigger.addEventListener("click", () => {
    loadVehicleData(getSelectedVehicle(), true);
});

btnStart.addEventListener("click", startVoiceDesk);
btnStop.addEventListener("click", stopVoiceDesk);

btnApprove.addEventListener("click", () => processDecision("approved", "Manual Click"));
btnReject.addEventListener("click", () => processDecision("rejected", "Manual Click"));
btnPrintInvoice.addEventListener("click", prepareAndPrintInvoice);

// Initial Load
window.addEventListener("DOMContentLoaded", () => {
    loadVehicleData(getSelectedVehicle(), false);
});
