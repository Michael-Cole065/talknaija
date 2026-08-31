const fs = require("fs");
const path = require("path");

const actionFile =
    path.join(__dirname, "../data/adminActions.json");

function ensureFile() {

    const directory =
        path.dirname(actionFile);

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, {
            recursive: true
        });
    }

    if (
        !fs.existsSync(actionFile) ||
        fs.statSync(actionFile).size === 0
    ) {
        fs.writeFileSync(
            actionFile,
            "[]"
        );
    }

}

function getActions() {

    ensureFile();

    try {

        const data =
            fs.readFileSync(
                actionFile,
                "utf8"
            ).trim();

        return data
            ? JSON.parse(data)
            : [];

    } catch (error) {

        console.error(
            "❌ Could not read admin actions:",
            error
        );

        return [];

    }

}

function saveActions(actions) {

    ensureFile();

    fs.writeFileSync(
        actionFile,
        JSON.stringify(
            actions,
            null,
            2
        )
    );

}

function recordAction(action) {

    if (!action || !action.type) {
        return null;
    }

    const actions =
        getActions();

    const record = {

        id:
            `ACT-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        type:
            action.type,

        userId:
            action.userId || null,

        reportId:
            action.reportId || null,

        reason:
            action.reason || null,

        details:
            action.details || null,

        createdAt:
            new Date().toISOString()

    };

    actions.unshift(record);

    saveActions(actions);

    return record;

}

function getAllActions() {
    return getActions();
}

module.exports = {
    recordAction,
    getAllActions
};
