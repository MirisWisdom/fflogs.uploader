const {ipcRenderer} = require('electron')

ipcRenderer.on('parse-lines', (event, id, lines, scanning, selectedRegion, raidsToUpload) => {
	for (var i = 0; i < lines.length; i++) {
		parsedLineCount++
		try {
			parseLogLine(lines[i], scanning, selectedRegion, raidsToUpload)
		} catch (e) {
			ipcRenderer.sendToHost('parse-lines-completed', id, { success: false, parsedLineCount: parsedLineCount, line: lines[i], exception: e.message ? e.message : e })
			return
		}
	}
	ipcRenderer.sendToHost('parse-lines-completed', id, { success: true })
});

ipcRenderer.on('collect-fights', (event, id, pushFightIfNeeded, scanningOnly) => {
	if (pushFightIfNeeded)
		pushLogFight(scanningOnly)
	logFights.logVersion = logVersion
	logFights.gameVersion = gameVersion
	logFights.mythic = mythic
	logFights.startTime = startTime
	logFights.endTime = endTime
	
	ipcRenderer.sendToHost('collect-fights-completed', id, logFights)
});

ipcRenderer.on('collect-scanned-raids', (event, id) => {
	for (var i = 0; i < scannedRaids.length; ++i) {
		var raid = scannedRaids[i]
		var friendliesArray = new Array()
		for (var k in raid.friendlies) {
			 if (raid.friendlies.hasOwnProperty(k))
			 	friendliesArray.push(k)
		}
		var enemiesArray = new Array()
		for (var k in raid.enemies) {
			 if (raid.enemies.hasOwnProperty(k))
			 	enemiesArray.push(k)
		}
		friendliesArray.sort()
		enemiesArray.sort()
		
		scannedRaids[i].friendlies = friendliesArray
		scannedRaids[i].enemies = enemiesArray
	}
	
	ipcRenderer.sendToHost('collect-scanned-raids-completed', id, scannedRaids)
});

ipcRenderer.on('collect-master-info', (event, id) => {
	var result = {};
	result.lastAssignedActorID = lastAssignedActorID
	buildActorsString()
	result.actorsString = actorsString

	result.lastAssignedAbilityID = lastAssignedAbilityID
	buildAbilitiesStringIfNeeded() // For FF only, not for WoW.
	result.abilitiesString = abilitiesString

	result.lastAssignedTupleID = lastAssignedTupleID
	result.tuplesString = tuplesString

	result.lastAssignedPetID = lastAssignedPetID
	buildPetsString()
	result.petsString = petsString
	
	ipcRenderer.sendToHost('collect-master-info-completed', id, result)
});

ipcRenderer.on('clear-fights', (event, id) => {
	logFights = { fights: new Array() }
	scannedRaids = new Array()
	ipcRenderer.sendToHost('clear-fights-completed', id)
});

ipcRenderer.on('get-parser-version', (event) => {
	ipcRenderer.sendToHost('get-parser-version-completed', parserVersion)
});

ipcRenderer.on('clear-state', (event, id) => {
	clearParserState()
	parsedLineCount = 0
	ipcRenderer.sendToHost('clear-state-completed', id)
});

ipcRenderer.on('set-start-date', (event, id, startDate) => {
	logStartDate = logCurrDate = startDate
	ipcRenderer.sendToHost('set-start-date-completed', id)
});

window.setWarningText = (text) => {
	ipcRenderer.sendToHost('set-warning-text', text)
};

window.setErrorText = (text) => {
	ipcRenderer.sendToHost('set-error-text', text)
};
