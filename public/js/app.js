let dots = 0;
let searchAnimation = null;

const connectionStatus =
    document.getElementById("connectionStatus");

const homeScreen =
    document.getElementById("homeScreen");

const searchScreen =
    document.getElementById("searchScreen");

const callScreen =
    document.getElementById("callScreen");

const startBtn =
    document.getElementById("startBtn");

const autoCallToggle =
    document.getElementById("autoCallToggle");

const cancelBtn =
    document.getElementById("cancelBtn");

const endBtn =
    document.getElementById("endBtn");

const nextBtn =
    document.getElementById("nextBtn");

const muteBtn =
    document.getElementById("muteBtn");

const reportBtn =
    document.getElementById("reportBtn");

const onlineUsers =
    document.getElementById("onlineUsers");

const queueCount =
    document.getElementById("queueCount");

const timer =
    document.getElementById("timer");

const callHistoryList =
    document.getElementById(
        "callHistoryList"
    );

const historyLimitText =
    document.getElementById(
        "historyLimitText"
    );


/*
==================================================
CHAT ELEMENTS
==================================================
*/

const chatBox =
    document.getElementById("chatBox");

const chatMessages =
    document.getElementById(
        "chatMessages"
    );

const chatInput =
    document.getElementById(
        "chatInput"
    );

const chatSendBtn =
    document.getElementById(
        "chatSendBtn"
    );
const chatToggle =
    document.getElementById("chatToggle");

const chatUnreadBadge =
    document.getElementById("chatUnreadBadge");

let unreadMessages = 0;

if (chatToggle && chatBox) {

    chatToggle.onclick = () => {

        chatBox.classList.toggle(
            "hidden"
        );

        if (
            !chatBox.classList.contains("hidden")
        ) {

            unreadMessages = 0;

            if (chatUnreadBadge) {

                chatUnreadBadge.textContent =
                    "0";

                chatUnreadBadge.classList.add(
                    "hidden"
                );

            }

        }

if (
    chatBox.classList.contains("hidden")
) {

    chatToggle.childNodes[0].nodeValue =
        "💬 Open Chat ";

} else {

    chatToggle.childNodes[0].nodeValue =
        "💬 Hide Chat ";

}

    };

}

/*
==================================================
CALL VARIABLES
==================================================
*/

let seconds = 0;
let timerInterval = null;
let isMuted = false;


/*
==================================================
PERSISTENT ANONYMOUS USER ID
==================================================
*/

let userId =
    localStorage.getItem(
        "talknaijaUserId"
    );

if (!userId) {

    userId =
        crypto.randomUUID();

    localStorage.setItem(
        "talknaijaUserId",
        userId
    );

}


let isPremium =
    localStorage.getItem(
        "talknaijaPremium"
    ) === "true";


/*
==================================================
REGISTER USER
==================================================
*/

socket.emit(
    "registerUser",
    {
        userId,
        isPremium
    }
);


/*
==================================================
SCREEN CONTROL
==================================================
*/

function showScreen(screen) {

    homeScreen.classList.add(
        "hidden"
    );

    searchScreen.classList.add(
        "hidden"
    );

    callScreen.classList.add(
        "hidden"
    );


    const faqScreen =
        document.getElementById(
            "faqScreen"
        );

    const policyScreen =
        document.getElementById(
            "policyScreen"
        );

    const supportScreen =
        document.getElementById(
            "supportScreen"
        );


    if (faqScreen) {

        faqScreen.classList.add(
            "hidden"
        );

    }


    if (policyScreen) {

        policyScreen.classList.add(
            "hidden"
        );

    }


    if (supportScreen) {

        supportScreen.classList.add(
            "hidden"
        );

    }


    if (screen) {

        screen.classList.remove(
            "hidden"
        );

    }

    // INITIALIZE ADSENSE FOR VISIBLE SECONDARY SCREENS

    if (
        screen &&
        screen.id !== "homeScreen"
    ) {

        const ad =
            screen.querySelector(
                ".adsbygoogle"
            );

        if (ad) {

            try {

                (
                    window.adsbygoogle =
                    window.adsbygoogle || []
                ).push({});

            } catch (error) {

                console.log(
                    "AdSense initialization:",
                    error
                );

            }

        }

    }

}


/*
==================================================
CHAT RESET
==================================================
*/

function clearChat() {

    if (chatMessages) {

        chatMessages.innerHTML = "";

    }

    if (chatInput) {

        chatInput.value = "";

    }

    unreadMessages = 0;

    if (chatUnreadBadge) {

        chatUnreadBadge.textContent =
            "0";

        chatUnreadBadge.classList.add(
            "hidden"
        );

    }

}

/*
==================================================
ADD CHAT MESSAGE
==================================================
*/

    function addChatMessage(
	    message,
	    type,
	    senderId = null
	) {

    if (!chatMessages) {
        return;
    }

    const messageElement =
        document.createElement(
            "div"
        );

    messageElement.className =
        "chat-message " +
        type;

    const label =
        document.createElement(
            "div"
        );

    label.className =
        "chat-sender";

	label.textContent =
	    type === "mine"
        ? "Me:"
        : "Id" + senderId + ":";

    const text =
        document.createElement(
            "div"
        );

    text.className =
        "chat-text";

    text.textContent =
        message;

    messageElement.appendChild(
        label
    );

    messageElement.appendChild(
        text
    );

    chatMessages.appendChild(
        messageElement
    );

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


/*
==================================================
SEND CHAT MESSAGE
==================================================
*/

function sendChatMessage() {

    if (!chatInput) {
        return;
    }

    const message =
        chatInput.value.trim();

    if (!message) {
        return;
    }

    socket.emit(
        "chatMessage",
        message
    );

    addChatMessage(
        message,
        "mine"
    );

    chatInput.value = "";

    chatInput.focus();

}


/*
==================================================
CHAT SEND BUTTON
==================================================
*/

if (chatSendBtn) {

    chatSendBtn.onclick =
        sendChatMessage;

}


/*
==================================================
CHAT ENTER KEY
==================================================
*/

if (chatInput) {

    chatInput.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                sendChatMessage();

            }

        }
    );

}


/*
==================================================
RECEIVE CHAT MESSAGE
==================================================
*/


socket.on(
    "chatMessage",
    (data) => {

        if (
            !data ||
            typeof data.message !==
            "string"
        ) {

            return;

        }

	  addChatMessage(
	    data.message,
	    "theirs",
	    data.senderId
	);

        if (
            chatBox &&
            chatBox.classList.contains(
                "hidden"
            )
        ) {

            unreadMessages += 1;

            if (chatUnreadBadge) {

                chatUnreadBadge.textContent =
                    unreadMessages;

                chatUnreadBadge.classList.remove(
                    "hidden"
                );

            }

        }

    }
);

/*
==================================================
CALL RESET
==================================================
*/

function resetCallState() {

    cleanupVoice();

    clearInterval(
        timerInterval
    );

    clearInterval(
        searchAnimation
    );

    seconds = 0;

    if (timer) {

        timer.textContent =
            "00:00";

    }

    isMuted = false;

    if (muteBtn) {

        muteBtn.textContent =
            "Mute";

    }

    clearChat();

}


/*
==================================================
SEARCH ANIMATION
==================================================
*/

function startSearchAnimation() {

    const status =
        document.getElementById(
            "status"
        );

    dots = 0;

    clearInterval(
        searchAnimation
    );

    searchAnimation =
        setInterval(
            () => {

                dots =
                    (dots + 1) %
                    4;

                if (status) {

                    status.textContent =
                        "Finding another Nigerian" +
                        ".".repeat(
                            dots
                        );

                }

            },
            500
        );

}


/*
==================================================
CALL HISTORY
==================================================
*/

function loadCallHistory() {

    socket.emit(
        "getCallHistory"
    );

}

const historyBtn =
    document.getElementById("historyBtn");

const historySection =
    document.getElementById(
        "callHistorySection"
    );

const closeHistoryBtn =
    document.getElementById(
        "closeHistoryBtn"
    );

if (
    historyBtn &&
    historySection
) {

    historyBtn.onclick =
        () => {

            historySection.classList.toggle(
                "hidden"
            );

            if (
                !historySection.classList.contains(
                    "hidden"
                )
            ) {

                loadCallHistory();

            }

        };

}


if (
    closeHistoryBtn &&
    historySection
) {

    closeHistoryBtn.onclick =
        () => {

            historySection.classList.add(
                "hidden"
            );

        };

}

function renderCallHistory(
history
) {

if (!callHistoryList) {
    return;
}

const limit =
    isPremium
        ? 15
        : 5;


if (historyLimitText) {

    historyLimitText.textContent =
        isPremium
            ? "Your last 15 calls"
            : "Your last 5 calls";

}


if (
    !history ||
    history.length === 0
) {

    callHistoryList.innerHTML = `
        <p class="history-empty">
            No call history yet.
        </p>
    `;

    return;

}


callHistoryList.innerHTML =
    history
        .slice(
            0,
            limit
        )
        .map(
            (call) => {

                const date =
                    new Date(
                        call.timestamp
                    );

                const formattedDate =
                    date.toLocaleString();


		let buttonText =
    "Call Back";

let disabled =
    false;


if (
    call.callbackStatus ===
    "calling"
) {

    buttonText =
        "Calling";

    disabled =
        true;

}


else if (
    call.callbackStatus ===
    "ignored"
) {

    buttonText =
        "Ignored";

    disabled =
        true;

}







else if (
    call.callbackStatus ===
    "declined"
) {

    if (
        (call.declineCount || 0) >=
        3
    ) {

        buttonText =
            "Call Back 🔕";

        disabled =
            true;

    } else {

        buttonText =
            "Call Back";

        disabled =
            false;

    }

}


else if (
    call.callbackStatus ===
    "unavailable"
) {

    buttonText =
        "Unavailable";

    disabled =
        true;

}

else if (
    call.callbackStatus ===
    "unavailable"
) {

    buttonText =
        "Unavailable";

    disabled =
        false;

}


                return `
                    <div class="history-item">

                        <div class="history-info">

                            <strong>
                                Anonymous Nigerian
                            </strong>

                            <small>
                                ${formattedDate}
                            </small>

                        </div>

		<button
    class="callback-btn"
    data-partner-id="${call.partnerId}"
    ${disabled ? "disabled" : ""}
>
    ${buttonText}
</button>

                    </div>
                `;

            }
        )
        .join("");


const callbackButtons =
    callHistoryList.querySelectorAll(
        ".callback-btn"
    );


callbackButtons.forEach(
    (button) => {

        if (
            button.disabled
        ) {
            return;
        }

        button.onclick =
            () => {

                const partnerId =
                    button.dataset.partnerId;

                if (!partnerId) {
                    return;
                }

                button.disabled =
                    true;

                button.textContent =
                    "Calling";

                socket.emit(
                    "callbackRequest",
                    partnerId
                );

            };

    }
);

}

document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                ".callback-btn"
            );

        if (!button) {
            return;
        }

        if (button.disabled) {
            return;
        }

        const partnerId =
            button.dataset.partnerId;

        if (!partnerId) {
            return;
        }

        button.disabled =
            true;

        button.textContent =
            "Calling";

        socket.emit(
            "callbackRequest",
            partnerId
        );

    }
);

socket.on(
    "callHistory",
    (history) => {

        renderCallHistory(
            history
        );

    }
);

let callbackCountdownTimer = null;

function stopCallbackCountdown() {

    if (callbackCountdownTimer) {

        clearInterval(
            callbackCountdownTimer
        );

        callbackCountdownTimer =
            null;

    }

}

/*
==================================================
CALL BACK EVENTS
==================================================
*/

socket.on(
    "callbackCalling",
    (data) => {

        console.log(
            "📞 CALLBACK: Calling..."
        );


        stopCallbackCountdown();


        let secondsLeft =
            30;


        const partnerId =
            data &&
            data.partnerId;


        const button =
            partnerId
                ? document.querySelector(
                    `.callback-btn[data-partner-id="${partnerId}"]`
                )
                : null;


        if (button) {

            button.disabled =
                true;

            button.textContent =
                `Calling ${secondsLeft}s`;

        }


        callbackCountdownTimer =
            setInterval(
                () => {

                    secondsLeft--;


                    if (button) {

                        button.textContent =
                            `Calling ${secondsLeft}s`;

                    }


                    if (
                        secondsLeft <=
                        0
                    ) {

                        stopCallbackCountdown();

                    }

                },
                1000
            );

    }
);

socket.on(
    "callbackUnavailable",
    () => {
	stopCallbackCountdown();
        alert(
            "This person is currently unavailable."
        );

        loadCallHistory();

    }
);


socket.on(
    "callbackDeclined",
    (data) => {
	stopCallbackCountdown();
        if (
            data &&
            data.declineCount >=
            data.maxDeclines
        ) {

            alert(
                "Call back stopped after 3 declines."
            );

        } else {

            alert(
                "Your call back was declined."
            );

        }

        loadCallHistory();

    }
);


socket.on(
    "callbackIgnored",
    () => {
	stopCallbackCountdown();
        alert(
            "They did not answer within 30 seconds."
        );

        loadCallHistory();

    }
);


socket.on(
    "callbackLimitReached",
    () => {
	stopCallbackCountdown();
        alert(
            "Call back is disabled after 3 declines."
        );

        loadCallHistory();

    }
);


socket.on(
    "callbackExpired",
    () => {
	stopCallbackCountdown();
        loadCallHistory();

    }
);


socket.on(
    "callbackIncoming",
    (data) => {

        let secondsLeft =
            30;

        const overlay =
            document.createElement(
                "div"
            );

        overlay.style.position =
            "fixed";

        overlay.style.inset =
            "0";

        overlay.style.background =
            "rgba(0,0,0,0.65)";

        overlay.style.display =
            "flex";

        overlay.style.alignItems =
            "center";

        overlay.style.justifyContent =
            "center";

        overlay.style.zIndex =
            "9999";


        const box =
            document.createElement(
                "div"
            );

	box.style.background =
	    "#111";

	box.style.color =
	    "#fff";

	box.style.boxSizing =
	    "border-box";

	box.style.boxShadow =
	    "0 10px 30px rgba(0,0,0,0.35)";

        box.style.padding =
            "25px";

        box.style.borderRadius =
            "15px";

        box.style.textAlign =
            "center";

        box.style.maxWidth =
            "320px";

        box.style.width =
            "85%";


        const message =
            document.createElement(
                "div"
            );

        message.textContent =
            data &&
            data.message
                ? data.message
                : "Anonymous Nigerian is calling you back...";


        const countdown =
            document.createElement(
                "div"
            );

        countdown.style.fontSize =
            "22px";

        countdown.style.fontWeight =
            "bold";

        countdown.style.margin =
            "15px 0";

        countdown.textContent =
            `${secondsLeft}s`;


	const buttonRow =
	document.createElement(
	        "div"
	    );

	buttonRow.style.display =
	    "flex";

	buttonRow.style.justifyContent =
	    "center";

	buttonRow.style.gap =
	    "28px";

	buttonRow.style.marginTop =
	    "20px";

const acceptBtn =
    document.createElement(
        "button"
    );

acceptBtn.textContent =
    "Accept";

acceptBtn.style.background =
    "#22c55e";

acceptBtn.style.color =
    "#fff";

acceptBtn.style.border =
    "none";

acceptBtn.style.borderRadius =
    "10px";

acceptBtn.style.padding =
    "12px 20px";

acceptBtn.style.width =
    "115px";

acceptBtn.style.boxSizing =
    "border-box";

acceptBtn.style.minWidth =
    "115px";

acceptBtn.style.fontSize =
    "15px";

acceptBtn.style.fontWeight =
    "600";

acceptBtn.style.cursor =
    "pointer";

acceptBtn.style.margin =
    "0 8px";

const declineBtn =
    document.createElement(
        "button"
    );

declineBtn.textContent =
    "Decline";

declineBtn.style.background =
    "#ef4444";

declineBtn.style.color =
    "#fff";

declineBtn.style.border =
    "none";

declineBtn.style.borderRadius =
    "10px";

declineBtn.style.padding =
    "12px 20px";

declineBtn.style.width =
    "115px";

declineBtn.style.boxSizing =
    "border-box";

declineBtn.style.minWidth =
    "115px";

declineBtn.style.fontSize =
    "15px";

declineBtn.style.fontWeight =
    "600";

declineBtn.style.cursor =
    "pointer";

declineBtn.style.margin =
    "0 8px";

buttonRow.appendChild(
    acceptBtn
);

buttonRow.appendChild(
    declineBtn
);

	box.appendChild(
	    buttonRow
	);

        box.appendChild(
            message
        );

        box.appendChild(
            countdown
        );

        box.appendChild(
            acceptBtn
        );

        box.appendChild(
            declineBtn
        );

        overlay.appendChild(
            box
        );

        document.body.appendChild(
            overlay
        );


        let finished =
            false;


        const timer =
            setInterval(
                () => {

                    secondsLeft--;

                    countdown.textContent =
                        `${secondsLeft}s`;


                    if (
                        secondsLeft <=
                        0
                    ) {

                        finish(
                            "decline"
                        );

                    }

                },
                1000
            );


        function finish(
            response
        ) {

            if (finished) {
                return;
            }

            finished =
                true;


            clearInterval(
                timer
            );


            overlay.remove();


            socket.emit(
                "callbackResponse",
                response
            );

        }


        acceptBtn.onclick =
            () => {

                finish(
                    "accept"
                );

            };


        declineBtn.onclick =
            () => {

                finish(
                    "decline"
                );

            };

    }
);


/*
==================================================
ONLINE USERS
==================================================
*/

socket.on(
    "onlineUsers",
    (count) => {

        if (onlineUsers) {

            onlineUsers.textContent =
                count;

        }

    }
);


/*
==================================================
QUEUE COUNT
==================================================
*/

socket.on(
    "queueCount",
    (count) => {

        if (queueCount) {

            queueCount.textContent =
                count;

        }

    }
);


/*
==================================================
START TALKING
==================================================
*/

startBtn.onclick =
    () => {

        startBtn.disabled =
            true;

        showScreen(
            searchScreen
        );

        startSearchAnimation();

        socket.emit(
            "joinQueue"
        );

    };


/*
==================================================
CANCEL SEARCH
==================================================
*/

cancelBtn.onclick =
    () => {

        if (
            autoCallToggle &&
            autoCallToggle.checked
        ) {

            autoCallToggle.checked =
                false;

        }


        socket.emit(
            "endCall"
        );


        clearInterval(
            searchAnimation
        );


        startBtn.disabled =
            false;


        showScreen(
            homeScreen
        );

    };


/*
==================================================
MATCHED
==================================================
*/

socket.on(
    "matched",
    () => {

        console.log(
            "🎯 MATCHED"
        );


        connectionStatus.textContent =
            "Connecting...";


        clearInterval(
            searchAnimation
        );


        const status =
            document.getElementById(
                "status"
            );


        if (status) {

            status.textContent =
                "Connected!";

        }


        showScreen(
            callScreen
        );


        clearChat();


        seconds = 0;

        timer.textContent =
            "00:00";


        clearInterval(
            timerInterval
        );


        isMuted = false;

        muteBtn.textContent =
            "Mute";


        timerInterval =
            setInterval(
                () => {

                    seconds++;

                    const mins =
                        Math.floor(
                            seconds /
                            60
                        );

                    const secs =
                        seconds %
                        60;


                    timer.textContent =
                        String(
                            mins
                        ).padStart(
                            2,
                            "0"
                        ) +
                        ":" +
                        String(
                            secs
                        ).padStart(
                            2,
                            "0"
                        );

                },
                1000
            );

    }
);


/*
==================================================
END CALL
==================================================
*/

endBtn.onclick =
    () => {

        socket.emit(
            "endCall"
        );

        resetCallState();

        startBtn.disabled =
            false;

        connectionStatus.textContent =
            "Disconnected";

        loadCallHistory();

        showScreen(
            homeScreen
        );

    };

/*
==================================================
NEXT PERSON
==================================================
*/

nextBtn.onclick =
    () => {

        console.log(
            "⏭️ NEXT PERSON"
        );


	socket.emit(
	    "endCall",
	    "next"
	);

        cleanupVoice();


        clearInterval(
            timerInterval
        );


        clearInterval(
            searchAnimation
        );


        clearChat();


        seconds = 0;


        if (timer) {

            timer.textContent =
                "00:00";

        }


        startBtn.disabled =
            true;


        showScreen(
            searchScreen
        );


        const status =
            document.getElementById(
                "status"
            );


        if (status) {

            dots = 0;

            status.textContent =
                "Finding another Nigerian";


            clearInterval(
                searchAnimation
            );


            searchAnimation =
                setInterval(
                    () => {

                        dots =
                            (dots + 1) %
                            4;

                        status.textContent =
                            "Finding another Nigerian" +
                            ".".repeat(
                                dots
                            );

                    },
                    500
                );

        }


        socket.emit(
            "joinQueue"
        );

    };


/*
==================================================
CALL ENDED BY OTHER USER
==================================================
*/

socket.on(
    "callEnded",
    () => {

        console.log(
            "📞 callEnded received on this device"
        );

        resetCallState();

        connectionStatus.textContent =
            "Disconnected";

        loadCallHistory();

        alert(
            "The other user ended the call."
        );

        if (
            autoCallToggle &&
            autoCallToggle.checked
        ) {

            startBtn.disabled =
                true;

            showScreen(
                searchScreen
            );

            startSearchAnimation();

            socket.emit(
                "joinQueue"
            );

        } else {

            startBtn.disabled =
                false;

            showScreen(
                homeScreen
            );

        }

    }
);


/*
==================================================
MUTE
==================================================
*/

muteBtn.onclick =
    () => {

        if (!localStream) {

            console.log(
                "🎤 No microphone stream available."
            );

            return;

        }


        const audioTracks =
            localStream.getAudioTracks();


        if (
            audioTracks.length ===
            0
        ) {

            console.log(
                "❌ No audio track found."
            );

            return;

        }


        isMuted =
            !isMuted;


        audioTracks.forEach(
            (track) => {

                track.enabled =
                    !isMuted;

            }
        );


        if (isMuted) {

            muteBtn.textContent =
                "Unmute";

            debugLog(
                "🔇 MICROPHONE MUTED"
            );

        } else {

            muteBtn.textContent =
                "Mute";

            debugLog(
                "🎤 MICROPHONE UNMUTED"
            );

        }

    };


/*
==================================================
REPORT
==================================================
*/

reportBtn.onclick =
    () => {

        const choice =
            prompt(
                "WHY ARE YOU REPORTING THIS USER?\n\n" +
                "1. Harassment\n" +
                "2. Sexual or inappropriate behavior\n" +
                "3. Hate or abusive speech\n" +
                "4. Spam or scam\n" +
                "5. Other"
            );


        if (choice === null) {
            return;
        }


        const selected =
            choice.trim();


        const reasons = {

            "1":
                "Harassment",

            "2":
                "Sexual or inappropriate behavior",

            "3":
                "Hate or abusive speech",

            "4":
                "Spam or scam"

        };


        let reason;


        if (
            selected ===
            "5"
        ) {

            const customReason =
                prompt(
                    "Please describe the reason for your report:"
                );


            if (
                customReason ===
                null
            ) {

                return;

            }


            reason =
                customReason.trim();


            if (!reason) {

                alert(
                    "Please provide a reason for the report."
                );

                return;

            }

        } else if (
            reasons[selected]
        ) {

            reason =
                reasons[selected];

        } else {

            alert(
                "Please enter a number from 1 to 5."
            );

            return;

        }


        reportBtn.disabled =
            true;


        socket.emit(
            "reportUser",
            reason
        );

    };


/*
==================================================
REPORT SUBMITTED
==================================================
*/

socket.on(
    "reportSubmitted",
    () => {

        reportBtn.disabled =
            false;


        resetCallState();


        connectionStatus.textContent =
            "Disconnected";


        startBtn.disabled =
            false;


        loadCallHistory();


        alert(
            "Report submitted. Thank you for helping keep TalkNaija safe."
        );


        showScreen(
            homeScreen
        );

    }
);


/*
==================================================
INITIAL HISTORY LOAD
==================================================
*/

loadCallHistory();

/*
==================================================
TALKNAIJA SIDEBAR
==================================================
*/

const menuBtn =
    document.getElementById("menuBtn");

const closeMenuBtn =
    document.getElementById("closeMenuBtn");

const sideMenu =
    document.getElementById("sideMenu");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const coffeeMenuBtn =
    document.getElementById("coffeeMenuBtn");


function openSideMenu() {

    if (!sideMenu) {
        return;
    }

    sideMenu.classList.add("open");

    document.body.classList.add(
    "menu-open"

	);
    if (sidebarOverlay) {

        sidebarOverlay.classList.remove(
            "hidden"
        );

    }

}


function closeSideMenu() {

    if (!sideMenu) {
        return;
    }

    sideMenu.classList.remove("open");

    document.body.classList.remove(
    "menu-open"

	);

    if (sidebarOverlay) {

        sidebarOverlay.classList.add(
            "hidden"
        );

    }

}


if (menuBtn) {

    menuBtn.onclick =
        openSideMenu;

}


if (closeMenuBtn) {

    closeMenuBtn.onclick =
        closeSideMenu;

}


if (sidebarOverlay) {

    sidebarOverlay.onclick =
        closeSideMenu;

}


/*
==================================================
SIDEBAR NAVIGATION
==================================================
*/

function performSidebarNavigation(
    action
) {

    if (action === "home") {

        showScreen(
            homeScreen
        );

        return;

    }


if (action === "faq") {

    const faqScreen =
        document.getElementById(
            "faqScreen"
        );

    if (faqScreen) {

        showScreen(
            faqScreen
        );

    }

    return;

}

if (action === "policy") {

    const policyScreen =
        document.getElementById(
            "policyScreen"
        );

    if (policyScreen) {

        showScreen(
            policyScreen
        );

    }

    return;

}

if (action === "support") {

    const supportScreen =
        document.getElementById(
            "supportScreen"
        );

    if (supportScreen) {

        showScreen(
            supportScreen
        );

    }

    return;

}

    if (action === "premium") {

        alert(
            "TalkNaija Premium is coming soon."
        );

        return;

    }


    if (action === "coffee") {

        alert(
            "Buy Me a Coffee will be available soon."
        );

        return;

    }

}


/*
==================================================
LEAVE CALL CONFIRMATION
==================================================
*/

function showLeaveCallConfirmation(
    action
) {

    const overlay =
        document.createElement(
            "div"
        );

    overlay.style.position =
        "fixed";

    overlay.style.top =
        "0";

    overlay.style.left =
        "0";

    overlay.style.right =
        "0";

    overlay.style.bottom =
        "0";

    overlay.style.background =
        "rgba(0,0,0,0.65)";

    overlay.style.display =
        "flex";

    overlay.style.alignItems =
        "center";

    overlay.style.justifyContent =
        "center";

    overlay.style.zIndex =
        "99999";


    const box =
        document.createElement(
            "div"
        );

    box.style.background =
        "#0d1730";

    box.style.boxSizing =
        "border-box";

    box.style.boxShadow =
        "0 10px 30px rgba(0,0,0,0.35)";

    box.style.padding =
        "25px";

    box.style.borderRadius =
        "15px";

    box.style.textAlign =
        "center";

    box.style.maxWidth =
        "320px";

    box.style.width =
        "85%";


    const message =
        document.createElement(
            "div"
        );

    message.textContent =
        "Leave this conversation?";


    message.style.fontSize =
        "16px";

    message.style.fontWeight =
        "600";


    const description =
        document.createElement(
            "div"
        );

    description.textContent =
        "Your current call will end if you continue.";

    description.style.fontSize =
        "13px";

    description.style.opacity =
        "0.8";

    description.style.marginTop =
        "10px";


    const buttonRow =
        document.createElement(
            "div"
        );

    buttonRow.style.display =
        "flex";

    buttonRow.style.justifyContent =
        "center";

    buttonRow.style.gap =
        "28px";

    buttonRow.style.marginTop =
        "20px";


    const stayBtn =
        document.createElement(
            "button"
        );

    stayBtn.textContent =
        "Stay";

    stayBtn.style.background =
        "#22c55e";

    stayBtn.style.color =
        "#fff";

    stayBtn.style.border =
        "none";

    stayBtn.style.borderRadius =
        "10px";

    stayBtn.style.padding =
        "12px 20px";

    stayBtn.style.width =
        "115px";

    stayBtn.style.boxSizing =
        "border-box";

    stayBtn.style.minWidth =
        "115px";

    stayBtn.style.fontSize =
        "15px";

    stayBtn.style.fontWeight =
        "600";

    stayBtn.style.cursor =
        "pointer";

    stayBtn.style.margin =
        "0 8px";


    const leaveBtn =
        document.createElement(
            "button"
        );

    leaveBtn.textContent =
        "Leave Call";

    leaveBtn.style.background =
        "#ef4444";

    leaveBtn.style.color =
        "#fff";

    leaveBtn.style.border =
        "none";

    leaveBtn.style.borderRadius =
        "10px";

    leaveBtn.style.padding =
        "12px 20px";

    leaveBtn.style.width =
        "115px";

    leaveBtn.style.boxSizing =
        "border-box";

    leaveBtn.style.minWidth =
        "115px";

    leaveBtn.style.fontSize =
        "15px";

    leaveBtn.style.fontWeight =
        "600";

    leaveBtn.style.cursor =
        "pointer";

    leaveBtn.style.margin =
        "0 8px";


    buttonRow.appendChild(
        stayBtn
    );

    buttonRow.appendChild(
        leaveBtn
    );


    box.appendChild(
        message
    );

    box.appendChild(
        description
    );

    box.appendChild(
        buttonRow
    );

    overlay.appendChild(
        box
    );

    document.body.appendChild(
        overlay
    );


    stayBtn.onclick =
        () => {

            overlay.remove();

        };


    leaveBtn.onclick =
        () => {

            overlay.remove();

            socket.emit(
                "endCall"
            );

            resetCallState();

            startBtn.disabled =
                false;

            connectionStatus.textContent =
                "Disconnected";

            loadCallHistory();

            performSidebarNavigation(
                action
            );

        };

}


/*
==================================================
SIDEBAR BUTTONS
==================================================
*/

document
    .querySelectorAll(
        ".side-menu-item"
    )
    .forEach((item) => {

        item.addEventListener(
            "click",
            () => {

                const action =
                    item.dataset.menuAction;


                /*
                ========================================
                ACTIVE CALL
                ========================================
                */

                if (
                    callScreen &&
                    !callScreen.classList.contains(
                        "hidden"
                    )
                ) {

                    showLeaveCallConfirmation(
                        action
                    );

                    return;

                }


                closeSideMenu();

                performSidebarNavigation(
                    action
                );

            }
        );

    });


if (coffeeMenuBtn) {

    coffeeMenuBtn.onclick = () => {

        closeSideMenu();

        /*
        Existing Buy Me a Coffee
        functionality will be connected here.
        */

        alert(
            "Buy Me a Coffee will be connected soon."
        );

    };

}

/*
==================================================
TALKNAIJA SUPPORT FORM
==================================================
*/

const supportForm =
    document.getElementById(
        "supportForm"
    );

const supportStatus =
    document.getElementById(
        "supportStatus"
    );

const supportSubmitBtn =
    document.getElementById(
        "supportSubmitBtn"
    );


if (supportForm) {

    supportForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const email =
                document
                    .getElementById(
                        "supportEmail"
                    )
                    .value
                    .trim();

            const subject =
                document
                    .getElementById(
                        "supportSubject"
                    )
                    .value
                    .trim();

            const message =
                document
                    .getElementById(
                        "supportMessage"
                    )
                    .value
                    .trim();


            if (
                supportStatus
            ) {

                supportStatus.classList.add(
                    "hidden"
                );

            }


            if (
                supportSubmitBtn
            ) {

                supportSubmitBtn.disabled =
                    true;

                supportSubmitBtn.textContent =
                    "Sending...";

            }


            try {

                const response =
                    await fetch(
                        "/api/support",
                        {

                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email,
                                    subject,
                                    message
                                })

                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to send support request."
                    );

                }


                supportForm.reset();


                if (
                    supportStatus
                ) {

                    supportStatus.textContent =
                        "Message received. Your support request has been sent.";

                    supportStatus.classList.remove(
                        "hidden"
                    );

                }


            } catch (error) {

                console.error(
                    "Support submission error:",
                    error
                );


                if (
                    supportStatus
                ) {

                    supportStatus.textContent =
                        error.message ||
                        "Something went wrong. Please try again.";

                    supportStatus.classList.remove(
                        "hidden"
                    );

                }

            } finally {

                if (
                    supportSubmitBtn
                ) {

                    supportSubmitBtn.disabled =
                        false;

                    supportSubmitBtn.textContent =
                        "Send Message";

                }

            }

        }
    );

}

/*
==================================================
PAGE BACK BUTTONS
==================================================
*/

document
    .querySelectorAll(
        "[data-back-home]"
    )
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                showScreen(
                    homeScreen
                );

            }
        );

    });
