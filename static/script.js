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

// Configure Speech Recognition for English (Indian Accent)
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN"; // English (India) recognition

    recognition.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        userTranscript.textContent = text;
        console.log("Captured Speech (English):", text);
        handleCustomerIntent(text);
    };

    recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e);
        callStatus.textContent = "Listening... (Please speak in English)";
    };

    recognition.onend = () => {
        if (isCalling) {
            try { 
                recognition.start(); 
            } catch(err) {}
        }
    };
}

// Speak logic with clear English synthesis
function speak(text, callback) {
    botResponse.textContent = text;
    if (!synth) return;
    
    synth.cancel(); // Stop any pending speech
    if (synth.paused) {
        synth.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
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

// Save log into SQLite Database
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

// Start Call Button
btnStart.addEventListener("click", () => {
    isCalling = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    callStatus.textContent = "Call in progress... (Listening in English)";
    
    if (synth.paused) {
        synth.resume();
    }

    const welcomeMsg = "Hello! Welcome to MotoAssist service desk. How can I help you today?";
    speak(welcomeMsg, () => {
        if (recognition && isCalling) {
            try { 
                recognition.start(); 
            } catch (e) {}
        }
        logToDatabase("START_CALL", welcomeMsg, "call_started");
    });
});

// Stop Call Button
btnStop.addEventListener("click", () => {
    isCalling = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    callStatus.textContent = "Call ended";
    if (recognition) recognition.stop();
    if (synth) synth.cancel();
    logToDatabase("END_CALL", "Call ended by customer", "call_ended");
});

// Intent processing in English
function handleCustomerIntent(text) {
    const statusKeywords = ["status", "bike", "vehicle", "service", "update", "progress", "ready"];
    const approveKeywords = ["approve", "approved", "yes", "okay", "ok", "proceed", "replace", "confirm"];
    const rejectKeywords = ["reject", "declined", "no", "dont", "don't", "cancel", "later", "not now"];

    const isStatusQuery = statusKeywords.some(w => text.includes(w));
    const isApproval = approveKeywords.some(w => text.includes(w));
    const isRejection = rejectKeywords.some(w => text.includes(w));

    if (isStatusQuery) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                waEmpty.style.display = "none";
                waAlertBox.style.display = "block";
                
                const reply = `Your bike service is ${data.status_percent}% completed. Our technician found the ${data.issue_part} is worn out. Replacing it costs ${data.issue_cost} rupees. Do you approve the replacement?`;
                speak(reply);
                logToDatabase(text, reply, "status_inquiry");
            })
            .catch(err => {
                console.error("API error:", err);
                speak("Sorry, unable to fetch vehicle status right now.");
            });
    } else if (isApproval) {
        sendApproval("approved", text);
    } else if (isRejection) {
        sendApproval("rejected", text);
    } else {
        const fallback = "I could not understand. Please ask: What is my bike status? Or say Approve or Decline.";
        speak(fallback);
        logToDatabase(text, fallback, "unknown_input");
    }
}

// Approval and Rejection Logic
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
            reply = `Thank you! The replacement is approved. Your updated bill is ${data.new_bill} rupees, and delivery is scheduled for ${data.eta}.`;
        } else {
            approvalBadge.textContent = "Declined";
            approvalBadge.style.background = "#dc2626";
            waActions.innerHTML = "<p style='color:#f87171;'>❌ Additional repair declined.</p>";
            reply = `Understood. We will continue with regular service. Your delivery remains at ${data.eta}.`;
        }
        speak(reply);
        logToDatabase(userSpeechText || decision, reply, decision);
    })
    .catch(err => console.error("Approval error:", err));
}

// Manual button fallbacks
document.getElementById("btn-approve").addEventListener("click", () => sendApproval("approved", "Clicked Approve Button"));
document.getElementById("btn-reject").addEventListener("click", () => sendApproval("rejected", "Clicked Decline Button"));
