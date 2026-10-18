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

// 1. Speech Recognition Setup
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "te-IN"; // Telugu capture

    recognition.onstart = () => {
        callStatus.textContent = "Call in progress... (Listening: Telugu lo matladandi)";
    };

    recognition.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        userTranscript.textContent = text;
        console.log("Customer input:", text);
        handleCustomerConversation(text);
    };

    recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e);
        callStatus.textContent = "Listening... (Speak clearly)";
    };

    recognition.onend = () => {
        if (isCalling) {
            try { recognition.start(); } catch(err) {}
        }
    };
} else {
    alert("Mee browser lo Speech Recognition support ledu. Dayachesi Google Chrome vadandi.");
}

// 2. Safe Speak Function
function speakInTelugu(text, callback) {
    botResponse.textContent = text;
    
    if (!synth) {
        if (callback) callback();
        return;
    }
    
    try {
        synth.cancel();
        if (synth.paused) synth.resume();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Voice setting
        const voices = synth.getVoices();
        const teVoice = voices.find(v => v.lang.includes("te") || v.lang.includes("tel"));
        if (teVoice) {
            utterance.voice = teVoice;
            utterance.lang = "te-IN";
        } else {
            utterance.lang = "en-IN";
        }

        utterance.rate = 0.95;
        utterance.volume = 1;

        let hasCalledBack = false;
        const triggerCallback = () => {
            if (!hasCalledBack) {
                hasCalledBack = true;
                if (callback) callback();
            }
        };

        utterance.onend = triggerCallback;
        utterance.onerror = (e) => {
            console.warn("Speech error:", e);
            triggerCallback();
        };

        synth.speak(utterance);

        // Fallback: Oka vela audio play avvakapoyina 2 seconds lo mic on avvali
        setTimeout(triggerCallback, 2500);
    } catch (err) {
        console.error("Speak error:", err);
        if (callback) callback();
    }
}

// 3. Database Logging Function
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
    }).catch(err => console.error("Database log error:", err));
}

// 4. Start Call Logic
btnStart.addEventListener("click", () => {
    isCalling = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    callStatus.textContent = "Starting call...";
    
    // Mic direct ga start cheddam to avoid delay
    if (recognition) {
        try { recognition.start(); } catch (e) {}
    }

    const welcomeMsg = "నమస్కారం! మోటోఅసిస్ట్ సర్వీస్ డెస్క్‌కి స్వాగతం. మీ బైక్ సర్వీస్ గురించి చెప్పండి?";
    speakInTelugu(welcomeMsg, () => {
        logToDatabase("START_CALL", welcomeMsg, "call_started");
    });
});

// 5. End Call Logic
btnStop.addEventListener("click", () => {
    isCalling = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    callStatus.textContent = "Call ended";
    if (recognition) {
        try { recognition.stop(); } catch(e) {}
    }
    if (synth) synth.cancel();
    logToDatabase("END_CALL", "Call ended", "call_ended");
});

// 6. Conversational Intent Logic
function handleCustomerConversation(text) {
    const statusPatterns = ["status", "స్టేటస్", "ఎలా ఉంది", "ఎంతవరకు", "service", "సర్వీస్", "bike", "బైక్", "పని"];
    const problemPatterns = ["problem", "ఏమైంది", "ఏంటి సమస్య", "fault", "brake", "బ్రేక్", "issue", "రిపేర్"];
    const billPatterns = ["bill", "బిల్", "ఖర్చు", "amount", "డబ్బులు", "ఎంతవుతుంది", "cost", "price"];
    const timePatterns = ["eppudu", "ఎప్పుడు", "time", "టైమ్", "డెలివరీ", "delivery", "ఎప్పటికి", "ready"];
    const approvePatterns = ["approve", "చేయండి", "మార్చండి", "సరే", "ఓకే", "okay", "yes", "చెయ్", "హా", "ok"];
    const rejectPatterns = ["వద్దు", "vaddu", "oddu", "వద్దులే", "no", "reject", "క్యాన్సల్", "తర్వాత", "చేయవద్దు"];

    const isStatus = statusPatterns.some(p => text.includes(p));
    const isProblem = problemPatterns.some(p => text.includes(p));
    const isBill = billPatterns.some(p => text.includes(p));
    const isTime = timePatterns.some(p => text.includes(p));
    const isApprove = approvePatterns.some(p => text.includes(p));
    const isReject = rejectPatterns.some(p => text.includes(p));

    if (isApprove) {
        sendApproval("approved", text);
    } else if (isReject) {
        sendApproval("rejected", text);
    } else if (isProblem) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                const reply = `మీ బైక్ ${data.issue_part} బాగా అరిగిపోయింది. కొత్తది మార్చడానికి ₹${data.issue_cost} అవుతుంది. మార్చమంటారా?`;
                speakInTelugu(reply);
                logToDatabase(text, reply, "issue_inquiry");
            });
    } else if (isBill) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                const reply = `సాధారణ సర్వీస్ ఛార్జ్ ₹${data.base_bill}. అదనపు పార్ట్ తో కలిపి మొత్తం ₹${data.current_bill} అవుతుంది.`;
                speakInTelugu(reply);
                logToDatabase(text, reply, "bill_inquiry");
            });
    } else if (isTime) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                const reply = `మీ సర్వీస్ సాయంత్రం ${data.eta} కల్లా పూర్తవుతుంది.`;
                speakInTelugu(reply);
                logToDatabase(text, reply, "timing_inquiry");
            });
    } else if (isStatus) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                waEmpty.style.display = "none";
                waAlertBox.style.display = "block";
                
                const reply = `మీ బైక్ సర్వీస్ ${data.status_percent}% పూర్తయింది. టెక్నీషియన్ ${data.issue_part} పాడైనట్లు చెప్పారు. రీప్లేస్‌మెంట్‌కు ₹${data.issue_cost} అదనంగా అవుతుంది. మీరు సరేనంటారా?`;
                speakInTelugu(reply);
                logToDatabase(text, reply, "status_inquiry");
            });
    } else {
        const fallback = "క్షమించండి, మీ ప్రశ్న అర్థం కాలేదు. బైక్ స్టేటస్, బిల్లు లేదా డెలివరీ సమయం గురించి అడగండి.";
        speakInTelugu(fallback);
        logToDatabase(text, fallback, "unknown_input");
    }
}

// 7. Approval Actions
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
            reply = `ధన్యవాదాలు! మీ అప్రూవల్ నమోదయింది. కొత్త బ్రేక్ ప్యాడ్ మార్చబడుతుంది. మొత్తం బిల్లు ₹${data.new_bill}, డెలివరీ సమయం ${data.eta}.`;
        } else {
            approvalBadge.textContent = "Declined";
            approvalBadge.style.background = "#dc2626";
            waActions.innerHTML = "<p style='color:#f87171;'>❌ Additional repair declined.</p>";
            reply = `సరేనండి, అదనపు పార్ట్ మార్చడం రద్దు చేయబడింది. సాధారణ సర్వీస్ మాత్రమే పూర్తవుతుంది.`;
        }
        speakInTelugu(reply);
        logToDatabase(userSpeechText || decision, reply, decision);
    })
    .catch(err => console.error("Approval error:", err));
}

document.getElementById("btn-approve").addEventListener("click", () => sendApproval("approved", "Clicked Approve Button"));
document.getElementById("btn-reject").addEventListener("click", () => sendApproval("rejected", "Clicked Decline Button"));
