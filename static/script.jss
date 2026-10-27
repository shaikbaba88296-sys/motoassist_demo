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
let activeAudio = null;

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

function playReliableVoice(teluguScript, englishText) {
    botResponse.textContent = teluguScript;

    if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
    }

    // Google Translate TTS direct cloud stream (Mobile lo 100% sound play avthundi)
    const encodedText = encodeURIComponent(englishText);
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=te&client=tw-ob&q=${encodedText}`;

    activeAudio = new Audio(audioUrl);
    activeAudio.play().catch(() => {
        // Fallback to Web Speech API
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(englishText);
            utt.lang = "en-IN";
            window.speechSynthesis.speak(utt);
        }
    });
}

function startVoiceDesk() {
    btnStart.disabled = true;
    btnStop.disabled = false;
    callStateBadge.textContent = "Call Connected (Speaking)";
    callStateBadge.className = "state-live";

    const job = currentActiveJob;
    const teluguText = `నమస్కారం ${job.customer_name} గారు! మీ బండి ${job.vehicle_no} లో ${job.issue_part} సమస్య ఉంది. ఖర్చు ₹${job.issue_cost} అవుతుంది. మీరు దీనికి అంగీకరిస్తారా?`;
    const audioSpoken = `Namaskaram ${job.customer_name} garu. Mee bandi ${job.vehicle_no} lo ${job.issue_part} problem undi. Repair cost ${job.issue_cost} rupees. Meeru approve chesthaara?`;

    userTranscript.textContent = "Waiting for customer decision (Approve / Decline)...";
    playReliableVoice(teluguText, audioSpoken);
}

function stopVoiceDesk() {
    btnStart.disabled = false;
    btnStop.disabled = true;
    callStateBadge.textContent = "Call Ended";
    callStateBadge.className = "state-idle";
    if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

function processDecision(decision) {
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

        userTranscript.textContent = "Customer: Yes, Approve cheyandi.";
        const telugu = `ధన్యవాదాలు! మీ ఆమోదం నమోదయింది. మొత్తం బిల్లు ₹${newTotal}. రసీదు డౌన్‌లోడ్ చేసుకోవచ్చు.`;
        const audio = `Dhanyavaadaalu! Mee approval confirm ayindi. Total bill ${newTotal} rupees. Invoice download chesukondi.`;
        playReliableVoice(telugu, audio);
    } else {
        job.issue_status = "rejected";
        job.current_bill = job.base_bill;

        jobStatusPill.textContent = "Customer Declined";
        jobStatusPill.className = "pill-rejected";
        lblTotalBill.textContent = job.base_bill;

        userTranscript.textContent = "Customer: Vaddu, Decline cheyandi.";
        const telugu = `సరేనండి, అదనపు రిపేర్ రద్దు చేయబడింది. ప్రాథమిక బిల్లు ₹${job.base_bill} మాత్రమే.`;
        const audio = `Sare nandi, additional repair cancel chesamu. Regular bill ${job.base_bill} rupees mathrame untundi.`;
        playReliableVoice(telugu, audio);
    }
}

// Direct File Download Function (Receipt File Phone lo save avtundi)
function downloadInvoiceReceipt() {
    const job = currentActiveJob;
    const now = new Date().toLocaleString();
    const statusText = job.issue_status === "approved" ? "CUSTOMER APPROVED" : "CUSTOMER DECLINED";
    const additionalCost = job.issue_status === "approved" ? `INR ${job.issue_cost}` : "INR 0 (Declined)";
    const finalAmount = job.issue_status === "approved" ? (job.base_bill + job.issue_cost) : job.base_bill;

    const receiptContent = 
`=====================================================
      MOTOASSIST TWO-WHEELER SERVICE CENTER
     OFFICIAL SERVICE INVOICE & JOB CARD RECEIPT
=====================================================
Date & Time        : ${now}
Customer Name      : ${job.customer_name}
Vehicle Number     : ${job.vehicle_no}
Service Decision   : ${statusText}
Estimated Delivery : ${job.eta}
-----------------------------------------------------
1. General Service Maintenance : INR ${job.base_bill}
2. Additional Repair:
   - Part : ${job.issue_part}
   - Cost : ${additionalCost}
-----------------------------------------------------
TOTAL PAYABLE AMOUNT           : INR ${finalAmount}
=====================================================
Authorization Mode: Automated Voice Desk (MotoAssist AI)
Status: Completed
Thank you for choosing MotoAssist!
=====================================================`;

    // Direct Mobile File Download (Blob)
    const blob = new Blob([receiptContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Invoice_${job.vehicle_no}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Browser Print preview kuda trigger chesthundhi
    if (window.print) {
        setTimeout(() => {
            window.print();
        }, 500);
    }
}

vehicleSelect.addEventListener("change", (e) => {
    if (LOCAL_DATASETS[e.target.value]) {
        renderJobData(LOCAL_DATASETS[e.target.value]);
    }
});

btnCallTrigger.addEventListener("click", startVoiceDesk);
btnStart.addEventListener("click", startVoiceDesk);
btnStop.addEventListener("click", stopVoiceDesk);

btnApprove.addEventListener("click", () => processDecision("approved"));
btnReject.addEventListener("click", () => processDecision("rejected"));
btnPrintInvoice.addEventListener("click", downloadInvoiceReceipt);

window.addEventListener("DOMContentLoaded", () => {
    renderJobData(LOCAL_DATASETS[vehicleSelect.value || "AP09XX1234"]);
});
