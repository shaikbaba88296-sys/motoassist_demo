// Local Datasets
const LOCAL_DATASETS = {
    "AP09XX1234": {
        customer_name: "Ravi Kumar",
        vehicle_no: "AP09XX1234",
        issue_part: "Front Brake Pad",
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

// Update UI Card
function renderJobData(data) {
    currentActiveJob = Object.assign({}, data);
    lblCustName.textContent = data.customer_name;
    lblVehNo.textContent = data.vehicle_no;
    lblIssue.textContent = data.issue_part;
    lblIssueCost.textContent = data.issue_cost;
    lblBaseBill.textContent = data.base_bill;
    lblTotalBill.textContent = data.current_bill;
    lblEta.textContent = data.eta;

    if (data.issue_status === "approved") {
        jobStatusPill.textContent = "Customer Approved";
        jobStatusPill.className = "pill-approved";
    } else if (data.issue_status === "rejected") {
        jobStatusPill.textContent = "Customer Declined";
        jobStatusPill.className = "pill-rejected";
    } else {
        jobStatusPill.textContent = "Decision Pending";
        jobStatusPill.className = "pill-pending";
    }
}

function loadVehicleData(vehicleNo, autoStart = false) {
    if (LOCAL_DATASETS[vehicleNo]) {
        renderJobData(LOCAL_DATASETS[vehicleNo]);
    }
    if (autoStart) {
        startVoiceDesk();
    }
}

// 100% Guaranteed Speech Output (Mobile Compatible)
function speakVoice(teluguScript, spokenText, onComplete) {
    botResponse.textContent = teluguScript;

    if (!('speechSynthesis' in window)) {
        if (onComplete) onComplete();
        return;
    }

    window.speechSynthesis.cancel(); // Clear any queued speech

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = "en-IN";
    utterance.rate = 0.90;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    let hasRun = false;
    const finish = () => {
        if (!hasRun) {
            hasRun = true;
            if (onComplete) onComplete();
        }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    // Mobile fallback if onend fails to trigger
    setTimeout(finish, 4000);

    window.speechSynthesis.speak(utterance);
}

// Speech Recognition
function initRecognition() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "te-IN";

        recognition.onstart = () => {
            callStateBadge.textContent = "Listening...";
            callStateBadge.className = "state-live";
        };

        recognition.onresult = (event) => {
            const text = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            userTranscript.textContent = text;
            evaluateDecision(text);
        };

        recognition.onerror = () => {
            callStateBadge.textContent = "Listening (Speak)...";
        };

        recognition.onend = () => {
            if (isCalling) {
                try { recognition.start(); } catch (e) {}
            }
        };
    }
}

// Start Call Logic
function startVoiceDesk() {
    isCalling = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    callStateBadge.textContent = "Call Active";
    callStateBadge.className = "state-live";

    const job = currentActiveJob;
    const teluguText = `నమస్కారం ${job.customer_name} గారు! మీ బండి ${job.vehicle_no} లో ${job.issue_part} సమస్య ఉంది. దీనికి ₹${job.issue_cost} అవుతుంది. మీరు ఆమోదిస్తారా?`;
    const spokenVoice = `Namaskaram ${job.customer_name} garu! Mee bandi ${job.vehicle_no} lo ${job.issue_part} problem undi. Repair cost ${job.issue_cost} rupees. Meeru approve chesthaara?`;

    speakVoice(teluguText, spokenVoice, () => {
        if (isCalling) {
            initRecognition();
            if (recognition) {
                try { recognition.start(); } catch (e) {}
            }
        }
    });
}

function stopVoiceDesk() {
    isCalling = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    callStateBadge.textContent = "Call Ended";
    callStateBadge.className = "state-idle";
    if (recognition) try { recognition.stop(); } catch(e) {}
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// Decision Parser
function evaluateDecision(text) {
    const approveTerms = ["approve", "చేయండి", "మార్చండి", "సరే", "ఓకే", "okay", "yes", "చెయ్", "హా", "ok"];
    const rejectTerms = ["వద్దు", "vaddu", "oddu", "no", "reject", "వద్దులే", "క్యాన్సల్"];

    if (approveTerms.some(t => text.includes(t))) {
        processDecision("approved", text);
    } else if (rejectTerms.some(t => text.includes(t))) {
        processDecision("rejected", text);
    } else {
        const telugu = `మీ బండి ${currentActiveJob.issue_part} రిపేర్ చేయడానికి అవును లేదా వద్దు అని చెప్పండి.`;
        const voice = `Mee bandi repair approve chesthara? Yes leda vaddu ani cheppandi.`;
        speakVoice(telugu, voice);
    }
}

// Process Decision
function processDecision(decision, rawText = "") {
    const job = currentActiveJob;

    if (decision === "approved") {
        const newTotal = job.base_bill + job.issue_cost;
        job.issue_status = "approved";
        job.current_bill = newTotal;
        job.eta = "05:45 PM";

        jobStatusPill.textContent = "Customer Approved";
        jobStatusPill.className = "pill-approved";
        lblTotalBill.textContent = newTotal;
        lblEta.textContent = job.eta;

        const telugu = `ధన్యవాదాలు! మీ ఆమోదం నమోదయింది. మొత్తం బిల్లు ₹${newTotal}. రసీదు ప్రింట్ తీసుకోండి.`;
        const voice = `Dhanyavaadaalu! Mee approval confirm ayindi. Total bill ${newTotal} rupees. Print receipt theesukondi.`;
        speakVoice(telugu, voice);
    } else {
        job.issue_status = "rejected";
        job.current_bill = job.base_bill;

        jobStatusPill.textContent = "Customer Declined";
        jobStatusPill.className = "pill-rejected";
        lblTotalBill.textContent = job.base_bill;

        const telugu = `సరేనండి, అదనపు రిపేర్ రద్దు చేయబడింది. ప్రాథమిక బిల్లు ₹${job.base_bill} మాత్రమే.`;
        const voice = `Sare nandi, additional repair cancel chesamu. Regular bill ${job.base_bill} rupees mathrame untundi.`;
        speakVoice(telugu, voice);
    }
}

// Print Slip
function prepareAndPrintInvoice() {
    const job = currentActiveJob;

    document.getElementById("print-date").textContent = new Date().toLocaleString();
    document.getElementById("print-veh-no").textContent = job.vehicle_no;
    document.getElementById("print-cust-name").textContent = job.customer_name;
    document.getElementById("print-base-bill").textContent = `₹${job.base_bill}`;
    document.getElementById("print-issue-desc").textContent = job.issue_part;
    document.getElementById("print-eta").textContent = job.eta;

    const decisionText = job.issue_status === "approved" ? "CUSTOMER APPROVED" : (job.issue_status === "rejected" ? "CUSTOMER DECLINED" : "PENDING");
    document.getElementById("print-decision").textContent = decisionText;

    if (job.issue_status === "approved") {
        document.getElementById("print-part-status").textContent = "Authorized & Added";
        document.getElementById("print-issue-cost").textContent = `₹${job.issue_cost}`;
        document.getElementById("print-final-total").textContent = `₹${job.current_bill}`;
    } else {
        document.getElementById("print-part-status").textContent = "Declined (Excluded)";
        document.getElementById("print-issue-cost").textContent = `₹0`;
        document.getElementById("print-final-total").textContent = `₹${job.base_bill}`;
    }

    window.print();
}

// Listeners
vehicleSelect.addEventListener("change", (e) => {
    loadVehicleData(e.target.value, false);
});

btnCallTrigger.addEventListener("click", () => {
    loadVehicleData(vehicleSelect.value, true);
});

btnStart.addEventListener("click", startVoiceDesk);
btnStop.addEventListener("click", stopVoiceDesk);

btnApprove.addEventListener("click", () => processDecision("approved", "Manual Click"));
btnReject.addEventListener("click", () => processDecision("rejected", "Manual Click"));
btnPrintInvoice.addEventListener("click", prepareAndPrintInvoice);

// Load Initial Data
window.addEventListener("DOMContentLoaded", () => {
    loadVehicleData(vehicleSelect.value, false);
});
