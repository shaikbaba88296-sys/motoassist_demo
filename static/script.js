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

// 1. Voice Recognition: Telugu Speech ని వింటుంది
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "te-IN"; // Telugu Speech Input

    recognition.onstart = () => {
        callStatus.textContent = "Call in progress... (Listening in Telugu)";
    };

    recognition.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        userTranscript.textContent = text;
        console.log("Customer input:", text);
        handleCustomerConversation(text);
    };

    recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e);
        callStatus.textContent = "Listening... (Telugu lo matladandi)";
    };

    recognition.onend = () => {
        if (isCalling) {
            try { recognition.start(); } catch(err) {}
        }
    };
}

// 2. Human-like Voice Output (Display in Telugu script, Speak in Indian Accent Phonics)
function speakNaturalTelugu(displayText, spokenPhonetics, callback) {
    botResponse.textContent = displayText; // స్క్రీన్ మీద స్వచ్ఛమైన తెలుగు కనిపిస్తుంది
    
    if (!synth) {
        if (callback) callback();
        return;
    }

    try {
        synth.cancel();
        if (synth.paused) synth.resume();

        // ఆడియో కోసం ఇండియన్ యాక్సెంట్ ఉన్న మాటలను పలుకుతుంది
        const utterance = new SpeechSynthesisUtterance(spokenPhonetics);
        utterance.lang = "en-IN"; // All devices/browsers support en-IN naturally
        utterance.rate = 0.90;    // Natural human conversation speed
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        let called = false;
        const finish = () => {
            if (!called) {
                called = true;
                if (callback) callback();
            }
        };

        utterance.onend = finish;
        utterance.onerror = (err) => {
            console.warn("TTS Error:", err);
            finish();
        };

        synth.speak(utterance);
        setTimeout(finish, 3500);
    } catch (e) {
        console.error("Speak error:", e);
        if (callback) callback();
    }
}

// 3. Database Logging
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

// 4. Start Call
btnStart.addEventListener("click", () => {
    isCalling = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    callStatus.textContent = "Starting call...";
    
    if (synth && synth.paused) synth.resume();
    if (recognition) {
        try { recognition.start(); } catch (e) {}
    }

    const teluguDisplay = "నమస్కారం! మోటోఅసిస్ట్ సర్వీస్ డెస్క్‌కి స్వాగతం. మీ బైక్ సర్వీస్ గురించి ఎలా సహాయపడగలను?";
    const spokenVoice = "Namaskaram! MotoAssist service desk ki swagatham. Mee bike service gurinchi cheppandi?";

    speakNaturalTelugu(teluguDisplay, spokenVoice, () => {
        logToDatabase("START_CALL", teluguDisplay, "call_started");
    });
});

// 5. End Call
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

// 6. Conversational Intelligence (Telugu Voice + Human Answers)
function handleCustomerConversation(text) {
    const statusWords = ["status", "స్టేటస్", "ఎలా ఉంది", "ఎంతవరకు", "service", "సర్వీస్", "bike", "బైక్", "పని"];
    const problemWords = ["problem", "ఏమైంది", "ఏంటి సమస్య", "fault", "brake", "బ్రేక్", "issue", "రిపేర్", "సమస్య"];
    const billWords = ["bill", "బిల్", "ఖర్చు", "amount", "డబ్బులు", "ఎంతవుతుంది", "cost", "price"];
    const timeWords = ["eppudu", "ఎప్పుడు", "time", "టైమ్", "డెలివరీ", "delivery", "ఎప్పటికి", "ready"];
    const approveWords = ["approve", "చేయండి", "మార్చండి", "సరే", "ఓకే", "okay", "yes", "చెయ్", "హా", "ok"];
    const rejectWords = ["వద్దు", "vaddu", "oddu", "వద్దులే", "no", "reject", "క్యాన్సల్", "తర్వాత", "చేయవద్దు"];

    const isStatus = statusWords.some(w => text.includes(w));
    const isProblem = problemWords.some(w => text.includes(w));
    const isBill = billWords.some(w => text.includes(w));
    const isTime = timeWords.some(w => text.includes(w));
    const isApprove = approveWords.some(w => text.includes(w));
    const isReject = rejectWords.some(w => text.includes(w));

    if (isApprove) {
        sendApproval("approved", text);
    } else if (isReject) {
        sendApproval("rejected", text);
    } else if (isProblem) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                const telugu = `మీ బైక్ ${data.issue_part} బాగా అరిగిపోయింది. కొత్తది మార్చడానికి ₹${data.issue_cost} అవుతుంది. మార్చమంటారా?`;
                const voice = `Mee bike front brake pad baaga arigipoindi andi. Kotthadi marchadaniki naalugu vandhala yaabhai rupayalu avuthundi. Marchamantey approve cheppandi.`;
                speakNaturalTelugu(telugu, voice);
                logToDatabase(text, telugu, "problem_inquiry");
            });
    } else if (isBill) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                const telugu = `సాధారణ సర్వీస్ బిల్లు ₹${data.base_bill}. అదనపు భాగాలు కలిపితే మొత్తం బిల్లు ₹${data.current_bill} అవుతుంది.`;
                const voice = `Normal service bill veyyi rendu vandhalu andi. Additional parts tho kalipi mottham bill ${data.current_bill} rupayalu avuthundi.`;
                speakNaturalTelugu(telugu, voice);
                logToDatabase(text, telugu, "bill_inquiry");
            });
    } else if (isTime) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                const telugu = `మీ సర్వీస్ సాయంత్రం ${data.eta} కల్లా పూర్తవుతుంది అండీ.`;
                const voice = `Mee bike service sayanthram ${data.eta} kalla poorthi avuthundi andi.`;
                speakNaturalTelugu(telugu, voice);
                logToDatabase(text, telugu, "time_inquiry");
            });
    } else if (isStatus) {
        fetch("/api/status?vehicle_no=AP09XX1234")
            .then(res => res.json())
            .then(data => {
                waEmpty.style.display = "none";
                waAlertBox.style.display = "block";

                const telugu = `మీ బైక్ సర్వీస్ ${data.status_percent}% పూర్తయింది. టెక్నీషియన్ ${data.issue_part} పాడైనట్లు చెప్పారు. రీప్లేస్‌మెంట్‌కు ₹${data.issue_cost} అవుతుంది. మీరు సమ్మతిస్తారా?`;
                const voice = `Mee bike service debbhai percent poorthi ayindi. Mechanic check chesinappudu front brake pad worn out ayyindi. Replacement ki naalugu vandhala yaabhai avuthundi. Meeru approve chesthaara?`;
                speakNaturalTelugu(telugu, voice);
                logToDatabase(text, telugu, "status_inquiry");
            });
    } else {
        const telugu = "క్షమించండి, మీ ప్రశ్న సరిగ్గా అర్థం కాలేదు. బైక్ స్టేటస్, సమస్య లేదా బిల్లు గురించి అడగండి.";
        const voice = "Kshaminchandi, mee prashna ardham kaaledu. Bike status, problem leda bill gurinchi adagandi.";
        speakNaturalTelugu(telugu, voice);
        logToDatabase(text, telugu, "unknown_query");
    }
}

// 7. Process Approvals
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
        let telugu = "";
        let voice = "";
        if (decision === "approved") {
            approvalBadge.textContent = "Approved";
            approvalBadge.style.background = "#16a34a";
            billAmount.textContent = data.new_bill;
            billEta.textContent = data.eta;
            waActions.innerHTML = "<p style='color:#4ade80;'>✅ Front brake pad replacement approved.</p>";

            telugu = `ధన్యవాదాలు! మీ అప్రూవల్ నమోదయింది. కొత్త బ్రేక్ ప్యాడ్ అమర్చబడుతుంది. మొత్తం బిల్లు ₹${data.new_bill}, డెలివరీ సమయం ${data.eta}.`;
            voice = `Dhanyavaadaalu! Mee approval confirm ayindi. Kotha brake pad replace chesthaamu. Updated bill ${data.new_bill} rupayalu, delivery time ${data.eta}.`;
        } else {
            approvalBadge.textContent = "Declined";
            approvalBadge.style.background = "#dc2626";
            waActions.innerHTML = "<p style='color:#f87171;'>❌ Additional repair declined.</p>";

            telugu = `సరేనండి, అదనపు భాగం మార్చడం రద్దు చేయబడింది. సాధారణ సర్వీస్ మాత్రమే పూర్తవుతుంది.`;
            voice = `Sare nandi, additional repair cancel chesamu. Regular service mathrame poorthi avuthundi.`;
        }
        speakNaturalTelugu(telugu, voice);
        logToDatabase(userSpeechText || decision, telugu, decision);
    })
    .catch(err => console.error("Approval error:", err));
}

document.getElementById("btn-approve").addEventListener("click", () => sendApproval("approved", "Clicked Approve Button"));
document.getElementById("btn-reject").addEventListener("click", () => sendApproval("rejected", "Clicked Decline Button"));
