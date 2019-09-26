import { setInterval } from 'timers';
import { fork } from 'child_process';

class trackedUserData {
    public identifier: string = null;

    public lastPing: number = null;
    public playtime: number = null;
    public lastconnection: number = null;

    public sourceIdentifier: string = null;
    public playerName: string = null;
}

/*
    1 -> rockstarID
    2 -> steam
*/
const mainIdentifier = 2;

class pTracker {
    private currentResourceName: string = GetCurrentResourceName();
    private trackedData: Array<trackedUserData> = [];

    onInit() {
        this.RegisterAllCommands()
        this.trackedData = this.getTrackedData()

        setInterval(this.updateActivePlayers.bind(this), true ? 5000 : 112000)
    }

    onPlayerDropped(playerId) {
        const playerSource = playerId, identifier = GetPlayerIdentifier(playerId, mainIdentifier), currentTime = Math.floor(new Date().getTime() / 1000)
        if (!playerSource || !identifier) return;

        const userIndex = this.trackedData.findIndex(data => data.identifier === identifier)
        if (this.trackedData[userIndex])
        {
            let userData = this.trackedData[userIndex]
            userData.playtime = userData.playtime + currentTime - userData.lastPing
            SaveResourceFile(this.currentResourceName, 'data/trackedData.json', JSON.stringify(this.trackedData), -1)

            this.trackedData.slice(userIndex)
        }
    }

    onPlayerActivated(s = null) {
        const playerId = s || (global as any).source
        const playerSource = playerId, identifier = GetPlayerIdentifier(playerId, mainIdentifier), currentTime = Math.floor(new Date().getTime() / 1000)
        if (!playerSource || !identifier) return;

        const userIndex = this.trackedData.findIndex(data => data.identifier === identifier)
        if (this.trackedData[userIndex]) {
            let userData = this.trackedData[userIndex]
            userData.lastPing = currentTime
            userData.lastconnection = currentTime
            userData.playerName = GetPlayerName(playerSource)
            userData.sourceIdentifier = playerSource
        } else {
            this.trackedData.push({
                identifier : identifier,
                lastPing : currentTime,
                lastconnection : currentTime,
                sourceIdentifier : playerSource,
                playtime : 0, // TODO_GET
                playerName : GetPlayerName(playerId)
            })
        }

        SaveResourceFile(this.currentResourceName, 'data/trackedData.json', JSON.stringify(this.trackedData), -1)
    }

    getTrackedData() {
        const trackedFile = LoadResourceFile(this.currentResourceName, 'data/trackedData.json')
        return trackedFile && JSON.parse(trackedFile)
    }
    
    updateActivePlayers() {
        const currentTime = Math.floor(new Date().getTime() / 1000)
        for (let index = this.trackedData.length - 1; index >= 0; index--) {
            let userData = this.trackedData[index];

            if (userData.sourceIdentifier && GetPlayerName(userData.sourceIdentifier)) {
                userData.playtime = userData.playtime + currentTime - userData.lastPing
                userData.lastPing = currentTime
            } else if (userData.sourceIdentifier) {
                // this.trackedData.splice(index)
                userData.sourceIdentifier = null
            }
        }

        SaveResourceFile(this.currentResourceName, "data/trackedData.json", JSON.stringify(this.trackedData), -1)
    }

    RegisterAllCommands() {
        const t = this;
        RegisterCommand("time", (playerSource) => {    
            const identifier = GetPlayerIdentifier(playerSource, mainIdentifier)
            const userDataIndex = this.trackedData.findIndex(data => data.identifier === identifier)

            if (!this.trackedData[userDataIndex]) return this.notifyChat(playerSource, "[pTracker]", "This identifier returned nothing.");

            this.notifyChat(playerSource, "[pTracker]", GetPlayerName(playerSource) + " spent: " + this.timeToString(this.trackedData[userDataIndex].playtime) + " on the server.")
        }, false)

        RegisterCommand("seen", (playerSource, args) => {
            const identifier = (args[0] && GetPlayerEndpoint(args[0])) ? GetPlayerIdentifier(args[0], mainIdentifier) : args[0]
            const userDataIndex = identifier && this.trackedData.findIndex(data => data.identifier === identifier)

            if (!this.trackedData[userDataIndex]) return this.notifyChat(playerSource, "[pTracker]", "This identifier returned nothing.");

            const date = new Date(this.trackedData[userDataIndex].lastconnection * 1000)
            this.notifyChat(playerSource, "[pTracker]", "Last seen in game: " + date)
        }, false)

        RegisterCommand("leaderboard", (playerSource) => {
            const leaderboard = this.trackedData
            leaderboard.sort(function(a, b) { return (a.playtime > b.playtime) ? 1 : -1 })

            let str = ""
            for (let index = 0; index < (leaderboard.length > 9 ? 9 : leaderboard.length); index++) {
                const element = leaderboard[index];
                str += (index + 1) + '. ' + (element.playerName || 'Unknown') + ' | ' + this.timeToString(element.playtime) + '\n'
            }

            this.notifyChat(playerSource, "[pTracker]", "Leaderboard\n" + str)
        }, false)

        RegisterCommand('forceSave', (playerSource) => {
            t.onPlayerActivated.bind(t)(playerSource)
        }, false)
    }

    // Utils
    notifyChat(intSource, stringPrefix, stringMessage, tblColor = [ 187, 0, 0 ]) {
        TriggerClientEvent("chatMessage", intSource, stringPrefix, tblColor, stringMessage)
    }

    timeToString(intTime) {
        let tmp = intTime;
        const seconds = Math.floor(tmp % 60)
        tmp = Math.floor(tmp / 60)
        const minutes = Math.floor(tmp % 60)
        tmp = Math.floor(tmp / 60)
        const hours = Math.floor(tmp % 24)
        tmp = Math.floor(tmp / 24)
        const days = Math.floor(tmp % 7), weeks = Math.floor(tmp / 7)

        return weeks + 'w ' + days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's'
    }
}

const a = new pTracker()
on('onResourceStart', (r) => {
    if (r == GetCurrentResourceName()) {
        a.onInit()
    }
});

on('hardcap:playerActivated', () => {
    const playerId = (global as any).source
    if (!WasEventCanceled())
        a.onPlayerActivated(playerId)
})

on('playerDropped', () => {
    const playerId = (global as any).source
    if (!WasEventCanceled())
        a.onPlayerDropped(playerId)
})