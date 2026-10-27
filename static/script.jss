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

let currentActiveJob = LOCAL_DATASETS["AP09XX1234"];

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

function renderJobData(data) {
    if (!data) return;
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

// 100% Reliable In-Browser Speech (Directly tied to User Tap)
function speakBotNow(teluguDisplay, phoneticsVoice) {
    botResponse.textContent = teluguDisplay;

    if (!('speechSynthesis' in window)) {
        alert("Browser does not support voice audio. Continuing visually.");
        return;
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }

    const msg = new SpeechSynthesisUtterance(phoneticsVoice);
    msg.rate = 0.88;
    msg.pitch = 1.0;
    msg.volume = 1.0;

    // Use default voice to avoid missing-voice freezing
    window.speechSynthesis.speak(msg);
}

// 1. Connect Call Action
function startCallFlow() {
    btnStart.disabled = true;
    btnStop.disabled = false;
    callStateBadge.textContent = "Call Active (Connected)";
    callStateBadge.className = "state-live";

    const job = currentActiveJob;
    const teluguText = `నమస్కారం ${job.customer_name} గారు! మీ బండి ${job.vehicle_no} లో ${job.issue_part} సమస్య ఉంది. దీనికి ₹${job.issue_cost} అవుతుంది. మీరు దీనికి ఆమోదిస్తారా?`; const voicePhonetics = `Namaskaram ${job.customer_name} garu. Mee bandi ${job.vehicle_no} lo${job.issue_part} problem undi. Repair cost ${job.issue_cost} rupees. Meeru approve chesthaara?`;

    userTranscript.textContent = "Connecting... Click 'Approve' or 'Decline' below to simulate response.";
    speakBotNow(teluguText, voicePhonetics);
}

// 2. Stop Call Action
function stopCallFlow() {
    btnStart.disabled = false;
    btnStop.disabled = true;
    callStateBadge.textContent = "Call Ended";
    callStateBadge.className = "state-idle";
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

// 3. Approval Decision Action
function makeDecision(decision) {
    const job = currentActiveJob;

    if (decision === "approved") {
        const newTotal = Number(job.base_bill) + Number(job.issue_cost);
        job.issue_status = "approved";
        job.current_bill = newTotal;
        job.eta = "05:45 PM";

        jobStatusPill.textContent = "Customer Approved";
        jobStatusPill.className = "pill-approved";
        lblTotalBill.textContent = newTotal;
        lblEta.textContent = job.eta;

        userTranscript.textContent = "Customer Voice: 'Ha, repair approve cheyandi.'";

        const teluguMsg = `ధన్యవాదాలు! మీ ఆమోదం నమోదయింది. అప్‌డేట్ చేసిన మొత్తం బిల్లు ₹${newTotal}. రసీదు ప్రింట్ తీసుకోండి.`;
        const voiceMsg = `Dhanyavaadaalu! Approval confirm ayindi. Total bill ${newTotal} rupees. Print invoice theesukondi.`;
        speakBotNow(teluguMsg, voiceMsg);
    } else {
        job.issue_status = "rejected";
        job.current_bill = job.base_bill;

        jobStatusPill.textContent = "Customer Declined";
        jobStatusPill.className = "pill-rejected";
        lblTotalBill.textContent = job.base_bill;

        userTranscript.textContent = "Customer Voice: 'Vaddu, cancel cheyandi.'";

        const teluguMsg = `సరేనండి, అదనపు రిపేర్ రద్దు చేయబడింది. ప్రాథమిక సర్వీస్ బిల్లు ₹${job.base_bill} మాత్రమే. రసీదు తీసుకోండి.`;
        const voiceMsg = `Sare nandi, repair cancel chesamu. Normal service bill ${job.base_bill} rupees mathrame untundi.`;
        speakBotNow(teluguMsg, voiceMsg);
    }
}

// 4. Guaranteed Invoice Download & Print
function triggerInvoiceDownload() {
    const job = currentActiveJob;
    const now = new Date().toLocaleString();
    const isApproved = job.issue_status === "approved";
    const decisionText = isApproved ? "CUSTOMER APPROVED" : "CUSTOMER DECLINED";
    const additionalCost = isApproved ? `INR ${job.issue_cost}` : "INR 0 (Declined)";
    const finalAmount = isApproved ? (Number(job.base_bill) + Number(job.issue_cost)) : job.base_bill;

    const receiptSlip = 
`======================================================
       MOTOASSIST SERVICE DESK - OFFICIAL INVOICE
======================================================
Generated Date     : ${now}
Customer Name      : ${job.customer_name}
Vehicle Number     : ${job.vehicle_no}
Approval Decision  : ${decisionText}
Delivery Time (ETA): ${job.eta}
------------------------------------------------------
1. General Service Charge      : INR ${job.base_bill}
2. Additional Repair Job:
   - Part Name                 : ${job.issue_part}
   - Repair Cost               : ${additionalCost}
------------------------------------------------------
FINAL PAYABLE AMOUNT           : INR ${finalAmount}
======================================================
Status: Processed & Verified
Thank
