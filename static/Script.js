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

// Speech recognition setup with mixed Telugu & English capture
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "te-IN"; // Telugu input capture

    recognition.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        userTranscript.textContent = text;
        console.log("Customer input:", text);
        handleCustomerConversation(text);
    };

    recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e);
        callStatus.textContent = "Call listening... (Telugu lo matladandi)";
    };

    recognition.onend = () => {
        if (isCalling) {
            try { recognition.start(); } catch(err) {}
        }
    };
}

// Speak logic with clear voice support
function speakInTelugu(text, callback) {
    botResponse.textContent = text;
    if (!synth) return;
    
    synth.cancel();
    if (synth.paused) {
        synth.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose available Telugu or Indian accent voice
    const voices = synth.getVoices();
    const teVoice = voices.find(v => v.lang.includes("te") || v.lang.includes("tel"));
    if (teVoice) {
        utterance.voice = teVoice;
        utterance.lang = "te-IN";
    } else {
        utterance.lang = "en-IN";
    }

    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1;

    utterance.onend = () => {
        if (callback) callback();
    };

    utterance.onerror = (e) => {
        console.error("Speech Synthesis Error:", e);
        if (callback) callback();
    };

    synth.speak(utterance);
}

// Save log into database
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

// Call Start logic
btnStart.addEventListener("click", () => {
    isCalling = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    callStatus.textContent = "Call in progress... (Telugu Assistant Ready)";
    
    if (synth.paused) synth.resume();

    const welcomeMsg = "నమస్కారం! మోటోఅసిస్ట్ సర్వీస్ డెస్క్‌కి స్వాగతం. మీ బైక్ సర్వీస్ గురించి ఎలా సహాయపడగలను?";
    speakInTelugu(welcomeMsg, () => {
        if (recognition && isCalling) {
            try { recognition.start(); } catch (e) {}
        }
        logToDatabase("START_CALL", welcomeMsg, "call_started");
    });
});

// Call End logic
btnStop.addEventListener("click", () => {
    isCalling = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    callStatus.textContent = "Call ended";
    if (recognition) recognition.stop();
    if (synth) synth.cancel();
    logToDatabase("END_CALL", "Call ended", "call_ended");
});

// Conversational Intent Engine for all customer questions
function handleCustomerConversation(text) {
    // 1. Status query patterns
    const statusPatterns = ["status", "స్టేటస్", "ఎలా ఉంది", "ఎంతవరకు", "service", "సర్వీస్", "bike", "బైక్", "పని"];
    // 2. Issue / Problem queries
    const problemPatterns = ["problem", "ఏమైంది", "ఏంటి సమస్య", "fault", "brake", "బ్రేక్", "issue", "రిపేర్"];
    // 3. Bill / Cost queries
    const billPatterns = ["bill", "బిల్", "ఖర్చు", "amount", "డబ్బులు", "ఎంతవుతుంది", "cost", "price"];
    // 4. Delivery / Timing queries
    const timePatterns = ["eppudu", "ఎప్పుడు", "time", "టైమ్", "డెలివరీ", "delivery", "ఎప్పటికి", "ready"];
    // 5. Approval patterns
    const approvePatterns = ["approve", "చేయండి", "మార్చండి", "సరే", "ఓకే", "okay", "yes", "చెయ్", "హా", "ok"];
    // 6. Decline patterns
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
                const reply = `మీ బండి తాలూకూ ${data.issue_part} బాగా అరిగిపోయింది అండీ. కొత్తది వేయడానికి ₹${data.issue_cost} ఖర్చవుతుంది. మీరు మార్చమంటారా?`;
                speakInTelugu(reply);
                logToDatabase(text, reply, "issue_inquiry");
            });
    } else if (isBill) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                const reply = `ప్రస్తుతం సర్వీస్ సాధారణ బిల్లు ₹${data.base_bill}. అదనపు బ్రేక్ ప్యాడ్ తో కలిపి మొత్తం ₹${data.current_bill} అవుతుంది.`;
                speakInTelugu(reply);
                logToDatabase(text, reply, "bill_inquiry");
            });
    } else if (isTime) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                const reply = `మీ బైక్ సర్వీస్ సాయంత్రం ${data.eta} కల్లా పూర్తవుతుంది అండీ.`;
                speakInTelugu(reply);
                logToDatabase(text, reply, "timing_inquiry");
            });
    } else if (isStatus) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                waEmpty.style.display = "none";
                waAlertBox.style.display = "block";
                
                const reply = `మీ బైక్ సర్వీస్ ${data.status_percent}% పూర్తయింది. టెక్నీషియన్ పరిశీలనలో ${data.issue_part} పాడైనట్లు గుర్తించారు. రీప్లేస్‌మెంట్‌కు ₹${data.issue_cost} అదనంగా అవుతుంది. మీరు సమ్మతిస్తారా?`;
                speakInTelugu(reply);
                logToDatabase(text, reply, "status_inquiry");
            });
    } else {
        const fallback = "క్షమించండి, మీ ప్రశ్న అర్థం కాలేదు. బైక్ స్టేటస్, బిల్లు, డెలివరీ సమయం లేదా సమస్య గురించి అడగగలరు.";
        speakInTelugu(fallback);
        logToDatabase(text, fallback, "unknown_input");
    }
}

// Approval and Rejection flow
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
            reply = `ధన్యవాదాలు! మీ అప్రూవల్ నమోదు చేయబడింది. కొత్త బ్రేక్ ప్యాడ్ మార్చబడుతుంది. మొత్తం బిల్లు ₹${data.new_bill}, డెలివరీ సమయం ${data.eta}.`;
        } else {
            approvalBadge.textContent = "Declined";
            approvalBadge.style.background = "#dc2626";
            waActions.innerHTML = "<p style='color:#f87171;'>❌ Additional repair declined.</p>";
            reply = `సరేనండి, అదనపు భాగం మార్చడం రద్దు చేయబడింది. సాధారణ సర్వీస్ మాత్రమే పూర్తవుతుంది. డెలివరీ సమయం ${data.eta}.`;
        }
        speakInTelugu(reply);
        logToDatabase(userSpeechText || decision, reply, decision);
    })
    .catch(err => console.error("Approval error:", err));
}

// Direct button fallbacks
document.getElementById("btn-approve").addEventListener("click", () => sendApproval("approved", "Clicked Approve Button"));
document.getElementById("btn-reject").addEventListener("click", () => sendApproval("rejected", "Clicked Decline Button"));
