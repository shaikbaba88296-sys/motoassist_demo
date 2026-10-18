let recognition = null;
let synth = window.speechSynthesis;
let isCalling = false;

const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const userTranscript = document.getElementById("user-transcript");
const botResponse = document.getElementById("bot-response");
const callStatus = document.getElementById("call-status");

const waEmpty = document.getElementById("wa-empty");
const waAlertBox = document.getElementById("wa-alert-box");
const approvalBadge = document.getElementById("approval-badge");
const billAmount = document.getElementById("bill-amount");
const billEta = document.getElementById("bill-eta");
const waActions = document.getElementById("wa-action-buttons");

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "te-IN";

    recognition.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        userTranscript.textContent = text;
        handleCustomerIntent(text);
    };

    recognition.onerror = () => {
        callStatus.textContent = "Mic listening...";
    };
}

function speak(text, callback) {
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.onend = () => { if (callback) callback(); };
    botResponse.textContent = text;
    synth.speak(utterance);
}

// Function to log conversation into database
function logToDatabase(userText, botText, action) {
    fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            vehicle_no: "AP09XX1234",
            user_speech: userText,
            bot_response: botText,
            action_taken: action
        })
    }).catch(err => console.error("Log error:", err));
}

btnStart.addEventListener("click", () => {
    isCalling = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    callStatus.textContent = "Call in progress...";
    
    const welcomeMsg = "Hello! Welcome to MotoAssist service desk. How can I help you today?";
    speak(welcomeMsg, () => {
        if (recognition && isCalling) recognition.start();
        logToDatabase("START_CALL", welcomeMsg, "initiated");
    });
});

btnStop.addEventListener("click", () => {
    isCalling = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    callStatus.textContent = "Call ended";
    if (recognition) recognition.stop();
    if (synth) synth.cancel();
    logToDatabase("END_CALL", "Call ended by user", "completed");
});

function handleCustomerIntent(text) {
    if (text.includes("status") || text.includes("enti") || text.includes("bike") || text.includes("vehicle")) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                waEmpty.style.display = "none";
                waAlertBox.style.display = "block";
                
                const reply = `Your bike service is ${data.status_percent}% completed. However, our technician noticed the ${data.issue_part} is worn out. Replacing it costs ${data.issue_cost} rupees. Do you approve?`;
                speak(reply);
                logToDatabase(text, reply, "status_inquired");
            });
    } else if (text.includes("approve") || text.includes("yes") || text.includes("sare") || text.includes("okay")) {
        sendApproval("approved", text);
    } else if (text.includes("reject") || text.includes("no") || text.includes("vaddu")) {
        sendApproval("rejected", text);
    }
}

function sendApproval(decision, userSpeechText = "") {
    fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            vehicle_no: "AP09XX1234",
            decision: decision
        })
    })
    .then(res => res.json())
    .then(data => {
        let reply = "";
        if (decision === "approved") {
            approvalBadge.textContent = "Approved";
            approvalBadge.style.background = "#16a34a";
            billAmount.textContent = data.new_bill;
            billEta.textContent = data.eta;
            waActions.innerHTML = "<p style='color:#4ade80;'>✅ Front brake pad replacement approved.</p>";
            reply = `Thank you! The replacement is approved. Your updated bill is ${data.new_bill} rupees, estimated delivery at ${data.eta}.`;
        } else {
            approvalBadge.textContent = "Declined";
            approvalBadge.style.background = "#dc2626";
            waActions.innerHTML = "<p style='color:#f87171;'>❌ Additional repair declined.</p>";
            reply = `Understood. We will proceed with regular service. Delivery remains at ${data.eta}.`;
        }
        speak(reply);
        logToDatabase(userSpeechText || decision, reply, decision);
    });
}

document.getElementById("btn-approve").addEventListener("click", () => sendApproval("approved", "Clicked Approve Button"));
document.getElementById("btn-reject").addEventListener("click", () => sendApproval("rejected", "Clicked Decline Button"));
