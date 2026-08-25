/*
==================================================
TALKNAIJA GLOBAL BAN GUARD
==================================================
*/

let talkNaijaBanned = false;


/*
==================================================
SHOW BAN DIALOG
==================================================
*/

function showBannedDialog(message) {

    if (talkNaijaBanned) {
        return;
    }

    talkNaijaBanned = true;

    console.log(
        "🚫 GLOBAL BAN LOCK ACTIVATED"
    );


    /*
    ================================================
    STOP PAGE SCROLLING
    ================================================
    */

    document.documentElement.style.overflow =
        "hidden";

    document.body.style.overflow =
        "hidden";


    /*
    ================================================
    DISABLE EXISTING CONTROLS
    ================================================
    */

    const controls =
        document.querySelectorAll(
            "button, input, textarea, select, summary"
        );

    controls.forEach(
        (element) => {

            element.disabled =
                true;

            element.setAttribute(
                "data-ban-disabled",
                "true"
            );

        }
    );


    /*
    ================================================
    CLOSE SIDEBAR
    ================================================
    */

    const sideMenu =
        document.getElementById(
            "sideMenu"
        );

    const sidebarOverlay =
        document.getElementById(
            "sidebarOverlay"
        );

    if (sideMenu) {

        sideMenu.classList.remove(
            "open"
        );

        sideMenu.style.pointerEvents =
            "none";

    }

    if (sidebarOverlay) {

        sidebarOverlay.classList.add(
            "hidden"
        );

        sidebarOverlay.style.pointerEvents =
            "none";

    }


    /*
    ================================================
    CREATE FULL-SCREEN LOCK
    ================================================
    */

    let overlay =
        document.getElementById(
            "talknaijaBannedOverlay"
        );

    if (overlay) {
        return;
    }


    overlay =
        document.createElement(
            "div"
        );

    overlay.id =
        "talknaijaBannedOverlay";


    /*
    ================================================
    OVERLAY STYLE
    ================================================
    */

    Object.assign(
        overlay.style,
        {
            position: "fixed",
            inset: "0",
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            boxSizing: "border-box",
            zIndex: "2147483647",
            pointerEvents: "auto"
        }
    );


    /*
    ================================================
    TALKNAIJA BAN DIALOG
    ================================================
    */

    const dialog =
        document.createElement(
            "div"
        );

    Object.assign(
        dialog.style,
        {
            background: "#0d1730",
            boxSizing: "border-box",
            boxShadow:
                "0 10px 30px rgba(0,0,0,0.35)",
            padding: "25px",
            borderRadius: "15px",
            textAlign: "center",
            maxWidth: "320px",
            width: "85%",
            color: "#ffffff"
        }
    );

    /*
    ================================================
    ICON
    ================================================
    */

    const icon =
        document.createElement(
            "div"
        );

    icon.textContent =
        "🚫";

    icon.style.fontSize =
        "42px";

    icon.style.marginBottom =
        "12px";

    /*
    ================================================
    TITLE
    ================================================
    */

    const title =
        document.createElement(
            "div"
        );

    title.textContent =
        "Account Restricted";

    title.style.fontSize =
        "16px";

    title.style.fontWeight =
        "600";

    /*
    ================================================
    MESSAGE
    ================================================
    */

    const text =
        document.createElement(
            "div"
        );

    text.textContent =
        message ||
        "Your account has been temporarily restricted due to multiple reports.";

    text.style.fontSize =
        "13px";

    text.style.lineHeight =
        "1.5";

    text.style.marginTop =
        "12px";

    text.style.opacity =
        "0.85";

    /*
    ================================================
    RESTRICTION NOTICE
    ================================================
    */

    const notice =
        document.createElement(
            "div"
        );

    notice.textContent =
        "You cannot use TalkNaija while this restriction is active.";

    notice.style.fontSize =
        "12px";

    notice.style.lineHeight =
        "1.5";

    notice.style.marginTop =
        "14px";

    notice.style.opacity =
        "0.65";

    /*
    ================================================
    BUILD DIALOG
    ================================================
    */

    dialog.appendChild(
        icon
    );

    dialog.appendChild(
        title
    );

    dialog.appendChild(
        text
    );

    dialog.appendChild(
        notice
    );

    overlay.appendChild(
        dialog
    );

    document.body.appendChild(
        overlay
    );


    /*
    ================================================
    BLOCK KEYBOARD
    ================================================
    */

    document.addEventListener(
        "keydown",
        blockBannedKeyboard,
        true
    );


    /*
    ================================================
    BLOCK CLICKS OUTSIDE OVERLAY
    ================================================
    */

    document.addEventListener(
        "click",
        blockBannedClicks,
        true
    );

}


/*
==================================================
BLOCK KEYBOARD
==================================================
*/

function blockBannedKeyboard(
    event
) {

    if (!talkNaijaBanned) {
        return;
    }

    event.preventDefault();

    event.stopPropagation();

}


/*
==================================================
BLOCK PAGE CLICKS
==================================================
*/

function blockBannedClicks(
    event
) {

    if (!talkNaijaBanned) {
        return;
    }

    const overlay =
        document.getElementById(
            "talknaijaBannedOverlay"
        );

    if (
        overlay &&
        overlay.contains(
            event.target
        )
    ) {

        return;

    }

    event.preventDefault();

    event.stopPropagation();

}


/*
==================================================
SOCKET BAN EVENT
==================================================
*/

if (
    typeof socket !== "undefined"
) {

    socket.on(
        "userBanned",
        (data) => {

            console.log(
                "🚫 USER BANNED:",
                data?.message ||
                "Account restricted."
            );

            showBannedDialog(
                data?.message
            );

        }
    );

}
