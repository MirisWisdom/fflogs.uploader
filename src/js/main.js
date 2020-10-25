require('electron').ipcRenderer.on('is-cli', (event, args) => {
    onInvoke(args)
})

require('electron').ipcRenderer.on('update-error', (event, err) => {
    alert(JSON.stringify(err, null, 0))
})

const {clipboard} = require('electron')

var game = new Game() // FIXME: Eventually parser.js interface will move into Game.
var scheme = "https"
var spinnyGif = '<img id="button-spinny" src="./assets/img/spinny.gif">'

var listeningToClipboard = false
var clipboardTimeout
var clipboardFile

// Get ByteArrays from Local Store
var baUser = null
var storedUser = ''

var autoLogin = false

function getStoredItem(key, addVersion) {
	return localStorage.getItem(game.prefix() + "-" + (addVersion ? storedVersion + '-' : '') + key)
}
	
function setStoredItem(key, item, addVersion) {
	return localStorage.setItem(game.prefix() + "-" + (addVersion ? storedVersion + '-' : '') + key, item)
}
	
function removeStoredItem(key) {
	return localStorage.removeItem(game.prefix() + "-" + key)
}

require('electron').ipcRenderer.on('download-progress', (event, progress)  => {
	selectReportPage('update')
	updateProgress(progress, "update-progress")
})

// Assume the local store can get corrupted and be robust
try {
	baUser = getStoredItem('username')
    storedUser = baUser || ''
    autoLogin = getStoredItem('autologin')
} catch (e) {
}

let preventLogin = false
require('electron').ipcRenderer.on('prevent-login', () => {
    preventLogin = true
    autoLogin = false
    selectReportPage('update')
})

var baGuild = null
var baRegionID = null
var baTeamID = null
var baVisibility = null
var baChooseFights = null
var baDirectory = null
var baFile = null
var baClipboardDirectory = null
var baLanguage = null
var baVersion = null

var storedGuild = ''
var storedRegionID = ''
var storedTeamID = ''
var storedVisibility = ''
var storedChooseFights = ''
var storedIncludeTrash = ''
var storedDirectory = ''
var storedClipboardDirectory = ''
var storedLanguage = ''
var storedVersion = ''

var selectedPrivacy = 0

var reportUIMode = "upload"

var logStartDate = ''

var splitZoneID = 0
var splitYearSet = false
var splitYear = 0
var previousSplitTime = 0

try {
	baVersion = getStoredItem("version")
} catch (e) {}

storedVersion = baVersion || "live"

baLanguage = getStoredItem('language')
storedLanguage = baLanguage || 'en'
storedVersion = game.modifyVersionForLanguage(storedVersion, storedLanguage)

var appendVersion = storedVersion != "live"

try {
	baGuild = getStoredItem('guild', appendVersion)
	if (!game.defaultRegion())
		baRegionID = getStoredItem('region', appendVersion)
	baTeamID = getStoredItem('team', appendVersion)
	baVisibility = getStoredItem('visibility')
	baChooseFights = getStoredItem('choosefights')
	baIncludeTrash = getStoredItem('includetrash')
	baDirectory = getStoredItem('directory', appendVersion)
	baFile = getStoredItem('file', appendVersion)
	baClipboardDirectory = getStoredItem('clipboarddirectory', appendVersion)
	
} catch (e) {
}

var storedDisplayName = ''

var loggedIn = false

var selectedGuild
var selectedRegion = game.defaultRegion()
var selectedTeam = 0
var selectedLanguage = null
var selectedVersion = null

storedLanguage = baLanguage || 'en'
	
function domainForLanguage()
{
	if (storedLanguage == "en")
		return "www"
	return storedLanguage
}

var domain = domainForLanguage()
loadLocaleJSON()

var host = game.site(domain, storedVersion)
var locales = game.locales()
var versions = game.versions()

var guildList = trans('lost_connection')

var liveLogging = false
var loader = null
var liveLogChangeInterval = 5000
var liveLogPosition = 0
var liveLogLastModified = 0
var liveLogLastSize = 0
var terminateLogging = false
var reportCode = ''
var lastReportCode = ''
var collectedFights = { fights: new Array() }

var unchangedCount = 0

var debugMode = false

var splitFileTimestamp = 0
var splitFileStream
var splittingLogFile = false
var previousTimestampForSplit = 0
var daylightSavingsSplitShift = 0

var scanningLogFileForRaids = false
var collectedScannedRaids = new Array()
var raidsToUpload = new Array()

var liveLoggingAutoStartDesc = ''
var fileDebugger = new DebugToFile(tmp.tmpdir + "/debug.txt", false)

function shortenPathString(pathString) {
    return pathString.split('\\').pop().split('/').pop();
}

function onInvoke(arguments)
{
	if (!arguments.length)
		return

	for (var i = 0; i < arguments.length; ++i) {
		if (arguments[i] == 'debug')
			debugMode = true
		if (arguments[i].indexOf('livelog=') != -1) {
			var desc = arguments[i].substr(8, arguments[i].length)
			if (desc.length <= 0)
                continue
			liveLoggingAutoStartDesc = desc
		}
	}
}

function logToDebugPanel(str)
{
	console.log(str)
}

function resetLoginButton()
{
	document.getElementById('login-button').innerHTML = trans("login")
}

function resetUploadButton()
{
	document.getElementById('upload-button').innerHTML = trans("go_button")
	document.getElementById('fights-button').innerHTML = trans("go_button")
}

function logout()
{
	autoLogin = false;
	removeStoredItem('autologin');
	
	resetLoginButton()
	document.getElementById('logout-link').style.display = 'none'
	document.getElementById('logincontent').style.display = 'block'
	document.getElementById('reportcontent').style.display = 'none'
	fillInLoginForm()
}

function selectPrivacy(setting)
{
	document.getElementById('privacy-0').removeAttribute('selected')
	document.getElementById('privacy-1').removeAttribute('selected')
	document.getElementById('privacy-2').removeAttribute('selected')
	
	document.getElementById('privacy-' + setting).setAttribute('selected', 'true')
	selectedPrivacy = setting
}

function showLanguageUI()
{
	goHome().then((value) => {
		selectReportPage('language')
		document.getElementById('logincontent').style.display = 'none'
		document.getElementById('reportcontent').style.display = 'block'
	});
}

function showVersionUI()
{
	goHome().then((value) => { 
		selectReportPage('version')
		document.getElementById('logincontent').style.display = 'none'
		document.getElementById('reportcontent').style.display = 'block'
	});
}

function displayReportUI()
{
	storedGuild = baGuild || ''
	storedRegionID = baRegionID || ''
	storedTeamID = baTeamID || ''
	
	storedVisibility = baVisibility || ''
	storedChooseFights = baChooseFights || ''
	storedIncludeTrash = baIncludeTrash || ''

    storedDirectory = baDirectory || ''
	storedFile = baFile || ''
	storedClipboardDirectory = baClipboardDirectory || ''
	
	selectReportPage('first')

	document.getElementById('startup-panel').style.display = 'none'
	document.getElementById('logout-link').style.display = 'inline'
	document.getElementById('logincontent').style.display = 'none'
	document.getElementById('reportcontent').style.display = 'block'
	
	buildGuilds()
	
	if (storedVisibility !== '')
		selectPrivacy(parseInt(storedVisibility))
	else
		selectPrivacy(0)
	
	if (storedChooseFights !== '')
		document.getElementById('fight-chooser').checked = (storedChooseFights == '1')
	
	if (storedIncludeTrash !== '')
		document.getElementById('include-trash').checked = (storedIncludeTrash == '1')
	
	if (storedDirectory !== '') {
		document.getElementById('directory').innerText = storedDirectory
		setFileDisplay(storedDirectory, 'directory-display')
	}
	
	if (storedFile !== '') {
		document.getElementById('logfile').innerText = storedFile
		setFileDisplay(storedFile, 'logfile-display')
	}
	
	if (storedClipboardDirectory !== '') {
		document.getElementById('clipboardfile').innerText = storedClipboardDirectory
		setFileDisplay(storedClipboardDirectory, 'clipboard-directory')
	}
	
	if (storedRegionID !== '' && !game.defaultRegion())
		selectRegion(parseInt(storedRegionID))

	if (liveLoggingAutoStartDesc != '') {
		setReportUIMode('livelog')
		selectReportPage('upload')
		document.getElementById('description').value = liveLoggingAutoStartDesc
		startLiveLoggingSession(liveLoggingAutoStartDesc, document.getElementById('directory').innerText)
		liveLoggingAutoStartDesc = ''
	}	
}

var appUpdater

function onClientUpdate(event) {
	//starts the update process
	appUpdater.checkNow();
}

function contentLoaded()
{
	game.contentLoaded();
	
	document.getElementById('language-link').innerHTML = locales[storedLanguage]
	if (!versions)
		document.getElementById('versions-container').style.display = 'none'
		
	if (!autoLogin || storedUser == '' || preventLogin) {
		fillInLoginForm();
		return;
	}
	
	var request = new XMLHttpRequest()
	request.onload = function(evt) {
		if (request.status != 200) {
			fillInLoginForm()
			return;
	    }
		
		var json = null
		try {
			json = JSON.parse(request.responseText)
		} catch (e) {
			fillInLoginForm()
    		return;
		}

	    if (json.success) {
		    loggedIn = true;
			guildList = buildGuildListFromJSON(json)
			displayReportUI()
	    } else
		    fillInLoginForm()
	};
	
	request.open("GET", scheme + "://" + host + "/client/check/?email=" + encodeURIComponent(storedUser) + "&version=4.4");
	request.send()
	
	var parser = document.getElementById('parser')
	var eventFunc = (event) => {
		if (event.channel == "set-warning-text")
			setWarningText(event.args[0])
		else if (event.channel == "set-error-text")
			setErrorText(event.args[0])
	};
	parser.addEventListener('ipc-message', eventFunc);
}

function fillInLoginForm()
{
	document.getElementById('startup-panel').style.display = 'none'
	document.getElementById('logincontent').style.display = 'block'
	
	// setTimeout(checkForUpdate, 200)
    document.getElementById('email').value = storedUser
    
    if (!storedUser) {
	    document.getElementById('email').focus()
		document.getElementById('email').select()
	} else
		document.getElementById('password').focus()
}

function setStatusText(text, hideSpinny)
{
}

function setProgressStatusText(text, id)
{
	document.getElementById(id).innerHTML = text
}

function setErrorText(text)
{
	var errorBlock = document.getElementById('errorblock')
	if (text == '')
	    errorBlock.style.display = 'none'
	else
		errorBlock.style.display = 'block'

	document.getElementById('errortext').innerHTML = htmlEntities(text)
	document.body.offsetWidth
}

function setWarningText(text)
{
	var errorBlock = document.getElementById('warningblock')
	if (text == '')
	    errorBlock.style.display = 'none'
	else
		errorBlock.style.display = 'block'

	document.getElementById('warningtext').innerHTML = htmlEntities(text)
	document.body.offsetWidth
}

function setCancelButtonVisible(visible)
{
	var cancelButton = document.getElementById('cancelbutton')
	if (!visible)
	    cancelButton.style.display = 'none'
	else
		cancelButton.style.display = 'inline-block'
}

function buildGuildListFromJSON(json)
{
	var guildsResult = '<div id="guilds">'
	var teamsResult = ''
	for (var i = 0; i < json.guilds.length; ++i) {
		var guild = json.guilds[i]
		
		guildsResult += '<button class="bnet-char-tab" id="guild-' + guild.id + '" guildid="' + guild.id + '">'
		guildsResult += '<img class="bnet-char-pic" src="https://dmszsuqyoe6y6.cloudfront.net/img/' + game.prefix() + '/faction-' + guild.faction + '.png">'
		guildsResult += '<span class="bnet-char-name-container"><span class="bnet-char-name">' + guild.name + '</span>'
		guildsResult += '<br>' + guild.server + '</button>'
		
		teamsResult += '<div style="display:none" id="teams-' + guild.id + '" guildid="' + guild.id + '">'
		teamsResult += '<p>' + json.chooseRaidTeamStr + '<br>'
		teamsResult += '<span id="teams-' + guild.id + '-0" class="region-tab" teamid="0">' + json.noneStr + '</span>'
		
		for (var j = 0; j < guild.teams.length; ++j) {
			var team = guild.teams[j]
			teamsResult += '<span id="teams-' + guild.id + '-' + team.id + '" class="region-tab" teamid="' + team.id + '">'
			teamsResult += team.name + '</span>'
		}
		
		teamsResult += "</p></div>"
	}
	
	guildsResult += '<button class="bnet-char-tab" onclick="selectGuild(0)" id="guild-0" guildid="0">'
	guildsResult += '<img class="bnet-char-pic" src="https://dmszsuqyoe6y6.cloudfront.net/img/' + game.prefix() + '/faction-' + json.personalFaction + '.png">'
	guildsResult += '<span class="bnet-char-name-container"><span class="bnet-char-name">' + json.userName + '</span><br>'
	guildsResult += json.personalLogsStr + "</button>"

	var regionsResult = '<div id="regions" style="display:none">'
	regionsResult += '<p>' + json.chooseRegionStr + "<br>"
	for (var k = 0; k < json.regions.length; ++k) {
		var region = json.regions[k]
		regionsResult += '<span id="region-' + region.id + '" class="region-tab" regionid="' + region.id + '">' + region.name + '</span>'
	}
	regionsResult += "</p></div>"
	
	return guildsResult + teamsResult + regionsResult
}

function login(user, password)
{
    setErrorText('');
    if (preventLogin) {
        return
    }

	if (user == '' || password == '') {
		setErrorText(trans("missing_user_or_password"))
		return
	}

	document.getElementById('login-button').innerHTML = spinnyGif
	
	var loginFormData = new FormData();

	loginFormData.append("version", "4.4")
	loginFormData.append("email", user)
	loginFormData.append("password", password)

	var request = new XMLHttpRequest()
	request.onload = function(evt) {
		if (request.status != 200) {
    		setErrorText(trans("login_error"))
    		return;
	    }
		
		var json = null
		try {
			json = JSON.parse(request.responseText)
		} catch (e) {
			setErrorText(trans("login_error"))
    		return;
		}
		
		if (json.success) {
	    	loggedIn = true;
			if (!autoLogin) {
			    autoLogin = true;
		    	setStoredItem('autologin', true);
		    }
	    	
	    	try {
				baUser = user
                setStoredItem('username', baUser)
		    	storedUser = user
			} catch (e) {
			}

            guildList = buildGuildListFromJSON(json)
			displayReportUI()
	    } else {
	    	var errorText = json.errors
	    	if (!errorText)
	    		errorText = trans("empty_response_error");
	    	setErrorText(errorText)
	    }
	    document.getElementById('login-button').innerHTML = 'Log In'
    };
	request.open("POST", scheme + "://" + host + "/client/login/")
	request.send(loginFormData)
}

var file
var logStream

function updateProgress(percent, bar)
{
	var barInterior = document.getElementById(bar).firstChild;
	barInterior.style.width = percent + '%';
	
	var barNumber = document.getElementById(bar + "-number")
	barNumber.innerHTML = "(" + percent + "%)"
}

var isLogValid = false

var currentLinesIndex = 0
var linesChunk = null
var lineThreshold = 5000
var oldFilePosition = 0

var currentIPC = 1

var currentTimeout

var tempFile = null
var zipArchive = null

async function finishChunk()
{
	currentLinesIndex = 0
    linesChunk = null
    lineCount = 0

    deleteTempFile()
    
    return await ipcClearParserFights()
}

async function goHome()
{
	setErrorText('')
	setWarningText('')
	await cancelOrFinish('first')
}

async function cancelOrFinish(reportPage)
{
	var result = await finishChunk()
    if (!result)
    	return
    	
    if (currentTimeout)
    	clearTimeout(currentTimeout)
		
	resetUploadButton()
	
	selectReportPage(reportPage)
	
    isLogValid = false
    setStatusText('')
    setCancelButtonVisible(false)
    var result = await ipcClearParserState()
    if (!result)
	    return
    	
    liveLogging = false
    liveLogPosition = 0
    liveLogLastModified = 0
    liveLogLastSize = 0
    lastCombatEventTime = 0
    terminateLogging = false
    unchangedCount = 0
    reportCode = ''
    file = null
	currentIPC++
	
	logStartDate = ''
	
    splittingLogFile = false
    splitFileTimestamp = 0
    previousTimestampForSplit = 0
    daylightSavingsSplitShift = 0
    splitZoneID = 0
    splitYearSet = false
    splitYear = 0
	previousSplitTime = 0
	
    scanningLogFileForRaids = false
	collectedScannedRaids = new Array()
	raidsToUpload = new Array()
	
    if (logStream) {
    	logStream.close()
		logStream = null
	}

	if (splitFileStream) {
		splitFileStream.close()
		splitFileStream = null
	}
}

function doProgress(e)
{
	var loaded = e.bytesLoaded;
	var total = e.bytesTotal;
	var percentLoaded = Math.ceil(( loaded / total ) * 100)
	updateProgress(percentLoaded, "upload-progress")
}

async function doCreateReportComplete(resp) {
    let responseText;
    await resp.text().then(text => responseText = text)
	if (responseText.substring(0, 7) === "Success") {
		selectReportPage('progress')
		lastReportCode = reportCode = responseText.substring(8)
		if (liveLogging) {
			setProgressStatusText(trans("livelog_started"), 'livelog-progress-status')
			logStartDate = game.fileStartDate(file) // This is for SWTOR only. The filename establishes what date the log was recorded on.
			if (logStartDate && !splittingLogFile)
				ipcSetStartDate(logStartDate) // Make sure the parser also knows the start date
			currentTimeout = setTimeout(checkForLiveLogChanges, liveLogChangeInterval)
		} else {
			currentTimeout = setTimeout(openLogFile, 0);
		}
	} else {
		await cancelOrFinish('upload')
		setErrorText(responseText)
	}

	loader = null
}

function deleteTempFile()
{
	if (tempFile) {
    	tempFile.cancel() // Stop the upload.
    	tempFile.deleteFile()
    	tempFile = null
    }
}

function doMasterTableComplete(e) {
	if (e.data.substring(0, 7) == "Success") {
		updateProgress(100, "upload-progress")
		setStatusText(trans("upload_chunk_success"));
		currentTimeout = setTimeout(compressReportSegment, 0);
		deleteTempFile()
	} else {
		cancelOrFinish('upload').then((value) => {
			setErrorText(e.data)
		});
	}
}

function doError(e) {
	// Uh-oh!
	cancelOrFinish('upload').then((value) => {
		setErrorText(trans("upload_error"))
		deleteTempFile()
	});
}

function doChunkComplete(e) {
	if (e.data == "Success") {
		updateProgress(100, "upload-progress")
		setUploadProgressContainer(false)
		if (liveLogging) {
			setProgressStatusText(trans("waiting_for_data"), "livelog-progress-status")
		} else
			setProgressStatusText(trans("reading_log_file"), "logfile-progress-status")
		finishChunk()
		if (terminateLogging) {
			handleLogTermination() // BE CAREFUL IF YOU EVER ADD CODE AFER THIS, WILL NEED TO AWAIT
		} else if (!liveLogging || logStream)
			currentTimeout = setTimeout(readFileChunk, 0)
		else
			currentTimeout = setTimeout(checkForLiveLogChanges, liveLogChangeInterval)
	} else {
		cancelOrFinish('upload').then((value) => { setErrorText(e.data) });
	}
}

function uploadReportSegment()
{
	fileDebugger.log("**** ----> uploadReportSegment")
	const { UPLOAD_COMPLETE_DATA, PROGRESS, ERROR } = ZipFile.events()
	currentTimeout = 0

	tempFile.addEventListener(UPLOAD_COMPLETE_DATA, doChunkComplete)
	tempFile.addEventListener(PROGRESS, doProgress)
	tempFile.addEventListener(ERROR, doError)

	var url = scheme + "://" + host + "/client/add-to-log/"

	// SETTINGS FOR THE REQUEST
	// todo - we need to set this in the request? in ZipFile?
	// request.cacheResponse = false

	// SOME VARIABLES (E.G. A FOLDER NAME TO SAVE THE FILE)
	var vars = {}
	vars.report = reportCode
	vars.start = collectedFights.startTime
	vars.end = collectedFights.endTime
	vars.mythic = collectedFights.mythic
	vars.livelog = liveLogging ? 1 : 0

	// UPLOAD THE FILE, DON'T TEST THE SERVER BEFOREHAND
	// todo -- what is this parameter 'logfile' for???
	// tempFile.upload(request, 'logfile', false)
	tempFile.upload(url, vars)
}

function setUploadProgressContainer(visible)
{
	var container = document.getElementById('upload-progress-container')
	if (visible)
		container.style.visibility = ''
	else
		container.style.visibility = 'hidden'
}

function uploadMasterReportTable()
{
	fileDebugger.log("**** ----> uploadMasterReportTable")
	const { UPLOAD_COMPLETE_DATA, PROGRESS, ERROR } = ZipFile.events()
	currentTimeout = 0

	tempFile.addEventListener(UPLOAD_COMPLETE_DATA, doMasterTableComplete)
	tempFile.addEventListener(PROGRESS, doProgress)
	tempFile.addEventListener(ERROR, doError)

	var url = scheme + "://" + host + "/client/set-master-table/"

	// SETTINGS FOR THE REQUEST
	// todo - we need to set this in the request? in ZipFile?
	// request.cacheResponse = false
	var vars = {}
	vars.report = reportCode

	// UPLOAD THE FILE, DON'T TEST THE SERVER BEFOREHAND
	// todo -- what is this parameter 'logfile' for???
	// tempFile.upload(request, 'logfile', false)
	tempFile.upload(url, vars)
}

function compressReportSegment()
{
	currentTimeout = 0
	if (!collectedFights.fights.length)
		return

	// First, we upload the master file that contains all actors, abilities and tuples.
	var fileString = ''
	fileString += collectedFights.logVersion + '|' + collectedFights.gameVersion + "\n"; // Version. Revs any time we change the file format.

	// Stitch the events back together into one chunk.
	var eventCount = 0
	var eventCombinedString = ''
	for (var i = 0; i < collectedFights.fights.length; ++i) {
		var fight = collectedFights.fights[i]
		eventCount += fight.eventCount
		eventCombinedString += fight.eventsString
	}

	fileString += eventCount + "\n"
	fileString += eventCombinedString

	// The next step is zipping up the events file.
	tempFile = ZipFile.createTempFile()
	tempFile.addFileFromString("log.txt", fileString)
	tempFile.finalize( () => {
		fileDebugger.log("------------------")
		fileDebugger.log("INSIDE THE SEGMENT:")
		fileDebugger.log("------------------")
		fileDebugger.log(fileString)
		setProgressStatusText(trans("uploading_new_fights"), "upload-progress-status")
		updateProgress(0, "upload-progress")
		currentTimeout = setTimeout(uploadReportSegment, 0)
	})
}

async function compressReport()
{
	currentTimeout = 0
	if (!collectedFights.fights.length)
		return

	// First, we upload the master file that contains all actors, abilities and tuples.
	var fileString = ''
	fileString += collectedFights.logVersion + '|' + collectedFights.gameVersion + "\n"; // Version. Revs any time we change the file format.
	
	var masterFile = await ipcCollectMasterFileInfo()
	if (!masterFile)
		return
		
	fileString += masterFile.lastAssignedActorID + "\n"
	fileString += masterFile.actorsString

	fileString += masterFile.lastAssignedAbilityID + "\n"
	fileString += masterFile.abilitiesString

	fileString += masterFile.lastAssignedTupleID + "\n"
	fileString += masterFile.tuplesString

	fileString += masterFile.lastAssignedPetID + "\n"
	fileString += masterFile.petsString

	// The next step is zipping up the tuples file.
	tempFile = ZipFile.createTempFile()

	fileDebugger.log("------------------")
	fileDebugger.log("INSIDE THE MASTER:")
	fileDebugger.log("------------------")
	tempFile.addFileFromString("log.txt", fileString)
	fileDebugger.log(fileString)
	tempFile.finalize( () => {
		setProgressStatusText(trans("uploading_new_actors"), "upload-progress-status")

		setUploadProgressContainer(true)
	
		updateProgress(0, "upload-progress")
		currentTimeout = setTimeout(uploadMasterReportTable, 0)
	})
}

function countLines(linesChunk, stopIndex)
{
	var result = 0
	for (var i = 0; i < stopIndex; ++i)
		result += linesChunk[i].length
	return result
}

async function readFileChunk()
{
	currentTimeout = 0
	var firstLineWasInvalid = false
	try {
		if (debugMode)
			logToDebugPanel("Entering readFileChunk with logStream position: " + logStream.position() + ".")
		if (!linesChunk || !linesChunk.length) {
			oldFilePosition = logStream.position()
            linesChunk = await logStream.readUTFChunk()
		}
		var lines = linesChunk.length ? linesChunk[currentLinesIndex] : null
		if (!isLogValid && lines && lines.length > 0) {
			var timestamp = game.scanLogLine(lines[0])
			if (timestamp == -1 && lines[0].trim().length) {	
				setErrorText('Line 1 - This is not a valid log file. Bad line was: ' + lines[0])
    			firstLineWasInvalid = true
    			isLogValid = false
    		} else
    			isLogValid = true
		}
		
		if (!firstLineWasInvalid && lines) {
			if (splittingLogFile) {
				for (var i = 0; i < lines.length; ++i) {
					var splitsOnTimestamp = game.splitsOnTimestamps()
		    		var splitsOnZoneChange = game.splitsOnZoneChanges()
		    		var oldZoneID = splitZoneID
	    			var timestamp = game.scanLogLine(lines[i]);
	                if (timestamp != -1) {
		            	// -2 is a magic value that means force a split. ESO uses this when BEGIN_LOG is seen.   
	                    if (timestamp == -2 || splitFileTimestamp == 0 || (splitsOnTimestamp && timestamp > previousTimestampForSplit + 60 * 1000 * 60 * 4) || (splitsOnZoneChange && oldZoneID && splitZoneID && splitZoneID != oldZoneID)) {
	                    	splitFileTimestamp = timestamp
	                    	createNewSplitFile()
	                    }
	                    splitFileStream.write(lines[i])
+	                    splitFileStream.write("\n")
	                    previousTimestampForSplit = timestamp
	                }
			    }
			} else {
				// Parsing
				var answer = await ipcParseLogLines(lines, scanningLogFileForRaids)
				if (!answer.success) {
					if (answer.exception)
						setErrorText("Line " + answer.parsedLineCount + " - " + (answer.exception.message ? answer.exception.message : answer.exception) + "-" + answer.line)
					isLogValid = false
					if (debugMode)
		    			logToDebugPanel(answer.exception)
				}
			}
		}
	   
	    if (isLogValid && !firstLineWasInvalid && linesChunk && linesChunk.length) {
		    currentLinesIndex++
		    if (currentLinesIndex < linesChunk.length) {
	    		if (debugMode)
	    			logToDebugPanel("Line threshold of 5000 exceeded. Calling readFileChunk again.")
	    		currentTimeout = setTimeout(readFileChunk, 0)
		    	updateProgress(Math.ceil(100 * (oldFilePosition + (countLines(linesChunk, currentLinesIndex) / countLines(linesChunk, linesChunk.length)) * (logStream.position() - oldFilePosition) - liveLogPosition) / (logStream.file().size - liveLogPosition)), "logfile-progress")
		    	return
	    	} else
	    		currentLinesIndex = 0
	    }
	    
	    if (isLogValid && !firstLineWasInvalid && (logStream.bytesAvailable() || !logStream.isComplete())) {
	    	if (debugMode)
				logToDebugPanel("More bytes are available. Our current position is " + logStream.position() + " and bytes available is " + logStream.bytesAvailable() + ".")
	    	linesChunk = null
	    	currentLinePosition = 0
	    	updateProgress(Math.ceil(100 * (logStream.position() - liveLogPosition) / (logStream.file().size - liveLogPosition)), "logfile-progress")
	    	var fights = await ipcCollectFightsFromParser(false, false)
	    	if (fights == null)
	    		return // Stale
	    	collectedFights = fights
            if (!collectedFights.fights.length) {
		    	currentTimeout = setTimeout(readFileChunk, 0)
    		} else {
    			setProgressStatusText("Processed " + collectedFights.fights.length + " New Fights. Compressing Combat Log Data", "livelog-progress-status")
    			currentTimeout = setTimeout(compressReport, 0)
    		}
		    return
	    }
    }
    catch (e) {
    	setErrorText(e)
    	isLogValid = false
    	if (debugMode)
    		logToDebugPanel(e)
    }

    var position = logStream ? logStream.position() : 0
    if (debugMode)
		logToDebugPanel("Finished readFileChunk with position of " + position + ".")
    currentLinePosition = 0
    linesChunk = null
    if (logStream) {
    	logStream.close()
		logStream = null
	}

    if (isLogValid) {
	    if (liveLogging) {
    		liveLogPosition = position
    		if (debugMode)
				logToDebugPanel("Set live log position to " + liveLogPosition + ".")
			var fights = await ipcCollectFightsFromParser(false, false)
	    	if (fights == null)
	    		return // Stale
	    	collectedFights = fights
	    	if (!collectedFights.fights.length) {
    			currentTimeout = setTimeout(checkForLiveLogChanges, liveLogChangeInterval)
    			setProgressStatusText(trans("waiting_for_fight_end"), "livelog-progress-status")
    			return
    		}
    		setProgressStatusText(trans("processed_new_fights") + " " + trans("compressing_data"), "livelog-progress-status")
    	} else {
	    	var fights = await ipcCollectFightsFromParser(true, scanningLogFileForRaids)
    		if (fights == null)
	    		return // Stale
	    	collectedFights = fights
	    	terminateLogging = true
    		setProgressStatusText(trans("compressing_data"), "livelog-progress-status")
    	}
		if (collectedFights.fights.length)
			currentTimeout = setTimeout(compressReport, 0)
		else if (scanningLogFileForRaids) {
			var raids = await ipcCollectScannedRaidsFromParser()
	    	if (raids == null)
	    		return // Stale
	    	collectedScannedRaids = raids
			showFightSelectionUI()
		} else
			await handleLogTermination()
    } else {
    	setCancelButtonVisible(false)
    	var result = await ipcClearParserState()
    	if (!result)
    		return
    	document.getElementById("deletion-archival-ui").style.display = 'none'
    	if (splittingLogFile) {
    		fileForDeletionAndArchival = file
    		document.getElementById("deletelogbutton").innerHTML = trans("delete_button") + " " + file
			document.getElementById("archivelogbutton").innerHTML = trans("archive_button") + " " + file
			document.getElementById("deletion-archival-ui").style.display = ''
		}
    	file = null
    }
}

async function openLogFile()
{
	logStartDate = game.fileStartDate(file) // This is for SWTOR only. The filename establishes what date the log was recorded on.
	if (logStartDate && !splittingLogFile)
		ipcSetStartDate(logStartDate) // Make sure the parser also knows the start date
	
	currentTimeout = 0
	
	var initialText = trans("reading_log_file")
	if (splittingLogFile)
		initialText = trans("splitting_log_file")
	else if (scanningLogFileForRaids)
		initialText = trans("scanning_log_file")

	setProgressStatusText(initialText, "logfile-progress-status")
    updateProgress(0, "logfile-progress")
    setCancelButtonVisible(true)

    logStream = new LargeAsyncFileReader(game.logFileEncoding())
   	logStream.openAsync(file)
   	currentTimeout = setTimeout(readFileChunk, 0)
}

function processLogFile(description, filename)
{
	if (file)
		return

	fileForDeletionAndArchival = null
	
	setErrorText('')
	setWarningText('')

	if (!filename) {
		setErrorText(trans("no_file_selected_error"))
		return;
	}
	
	// Check if file exists
    const fileExists = fs.existsSync(filename)
    const fileStats = fileExists ? fs.statSync(filename) : null
    file = filename

	if (!fileStats || !fileExists) {
		setErrorText(trans("invalid_file_selected_error"))
		file = null
		return;
	}
	
	if (fileStats.size >= 1500000000) {
		setErrorText(trans("file_too_large_error"))
		file = null
		return
	}

	const modificationDate = fileStats.mtimeMs
    const creationDate = fileStats.ctimeMs
	if (game.hasSingletonLogFile() && !raidsToUpload.length && (modificationDate - creationDate) > 24 * 60 * 60 * 1000) {
		setErrorText(trans("file_too_many_days_error"))
		file = null
		return
	}

	if (selectedGuild == 0 && selectedRegion <= 0) {
		setErrorText(trans("no_region_selected_error"));
		file = null
		return
	}

	baVisibility = selectedPrivacy.toString()
	setStoredItem('visibility', baVisibility)

	baChooseFights = document.getElementById('fight-chooser').checked ? '1' : '0'

	baIncludeTrash = document.getElementById('include-trash').checked ? '1' : '0'

	setStoredItem('choosefights', baChooseFights)

	var loadingStr = spinnyGif
	document.getElementById('upload-button').innerHTML = loadingStr
	document.getElementById('fights-button').innerHTML = loadingStr

	updateProgress(0, "logfile-progress")
    liveLogging = false
	
	currentTimeout = setTimeout(createReport, 0)
}

async function doTerminateComplete(e) {
	if (e.data.substring(0, 7) == "Success") {
		updateProgress(100, "upload-progress")
		setStatusText(trans("cleanup_success"));
		await handleLogDeletionAndArchival()
	} else {
		await cancelOrFinish('upload')
		setErrorText(e.data)
	}
}

async function terminateReport()
{
	var url = scheme + "://" + host + "/client/terminate-log/" + reportCode
	currentTimeout = 0

	axios.get(url)
	.then(function (response) {
	  // handle success
	  console.log(response);
	  doTerminateComplete(response);
	})
	.catch(function (error) {
	  // handle error
	  console.log(error);
	})
}

async function handleLogTermination() {
	if (liveLogging || splittingLogFile) {
		await handleLogDeletionAndArchival()
		return
	}
	
	setProgressStatusText(trans("cleaning_up"), "upload-progress-status")
    updateProgress(0, "upload-progress")
    currentTimeout = setTimeout(terminateReport, 0)
}

async function stopLiveLoggingSession()
{
	var fights = await ipcCollectFightsFromParser(true, false)
	if (!fights)
		return
	collectedFights = fights
	if (collectedFights.fights.length) {
		terminateLogging = true
		setProgressStatusText(trans("uploading_remaining"), "livelog-progress-status")
		if (currentTimeout)
    		clearTimeout(currentTimeout)
		currentTimeout = setTimeout(compressReport, 0)
		return
	}
	handleLogTermination()
}

async function handleLogDeletionAndArchival() {
	fileForDeletionAndArchival = file
	var wasLiveLogging = liveLogging
	var wasSplitting = splittingLogFile
	await cancelOrFinish('deletion-archival')

	document.getElementById("deletion-archival-ui").style.display = 'none'

    if (fileForDeletionAndArchival) {
        if (wasLiveLogging) {
	        var logFile = game.hasSingletonLogFile() ? path.resolve(fileForDeletionAndArchival + '/' + game.singletonLogFileName()) : fileForDeletionAndArchival
            if (!logFile || !fs.existsSync(logFile))
            	return
            fileForDeletionAndArchival = logFile
        }
        const fileName = shortenPathString(fileForDeletionAndArchival)
        document.getElementById("deletion-archival-ui").style.display = ''
        document.getElementById("deletelogbutton").innerHTML = "Delete " + fileName
        document.getElementById("archivelogbutton").innerHTML = "Archive " + fileName
    }
}

function viewLog()
{
	var url = scheme + "://" + host + "/reports/" + lastReportCode + "/";
	require("electron").shell.openExternal(url);
}

function forgotPassword()
{
	var url = scheme + "://" + host + "/password/reset/";
	require("electron").shell.openExternal(url);
	return false;
}

function viewReleaseNotes()
{
	var url = scheme + "://" + host + "/client/release-notes/";
	require("electron").shell.openExternal(url);
}

async function createReport()
{
	var parserVersion = await ipcGetParserVersion()
	
	const startTime = new Date().getTime();
	
    const postData = {
        description: document.getElementById('description').value,
        guild: selectedGuild,
        team: selectedTeam,
        personal: -10000 - selectedRegion, // This is dumb, but it lets us share the field for backwards compatibility (and with WildStar)
        visibility: selectedPrivacy,
        start: startTime,
        end: startTime,
        parserVersion: parserVersion
    }

    fetch(scheme + "://" + host + "/client/create-report", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "include",
        headers: {
            "Content-Type": "application/json;",
        },
        redirect: "follow",
        referrer: "no-referrer",
        body: JSON.stringify(postData),
    }).then(
		(resp) => {
			if (resp.status != 200) {
				doError()
				return;
			}
			if (resp.status === 200) {
				// Do something with success
				loader = resp
				doCreateReportComplete(resp)
			}
		},
		(err) => doError(err)
	)

	// SETTINGS FOR THE REQUEST
	// todo - do we need to set this in the fetch above?
	// request.cacheResponse = false
}

async function checkForLiveLogChanges()
{
	currentTimeout = 0
	setErrorText('')

    var logFile = game.hasSingletonLogFile() ? path.resolve(file + "/" + game.singletonLogFileName()) : file
    var logFileExists = fs.existsSync(logFile)
    const fileStats = logFileExists ? fs.statSync(logFile) : null
	var logFileSize = logFileExists ? fileStats.size : 0
	var checkLastModified = game.liveLoggingChecksLastModified()
	
    // If no changes to log file, or doesn't exist
	if (!logFileExists || (checkLastModified && fileStats.mtime == liveLogLastModified) || (!checkLastModified && logFileSize == liveLogLastSize)  || liveLogPosition >= logFileSize) {
		if (debugMode) {
			const msg = "No changes encountered. Our position is " + liveLogPosition + " and the file's size is " + logFileSize + "."
			console.log(msg)
			logToDebugPanel(msg)
        }

        // If no changes after 120 seconds
		if (++unchangedCount == 24) { // 120 seconds more or less.
			var fights = await ipcCollectFightsFromParser(true, false)
			if (fights == null) // Stale
				return
			collectedFights = fights
			if (collectedFights.fights.length) {
				setProgressStatusText(trans("assuming_combat_over"), "livelog-progress-status")
				currentTimeout = setTimeout(compressReport, 0)
				return
			}
		}
		currentTimeout = setTimeout(checkForLiveLogChanges, liveLogChangeInterval)
		return
	}

	unchangedCount = 0

	liveLogLastModified = fileStats.mtime
	liveLogLastSize = logFileSize

	if (debugMode)
		logToDebugPanel("File changed! Our position is " + liveLogPosition + " and the file's size is " + fileStats.size + ".")

    logStream = new LargeAsyncFileReader(game.logFileEncoding())
   	logStream.openAsync(logFile, liveLogPosition)

    setProgressStatusText(trans("reading_new_log_data"), "livelog-progress-status")
    currentTimeout = setTimeout(readFileChunk, 0)
}

function liveLogLocationSelected([filepath])
{
	baDirectory = filepath
	document.getElementById('directory').innerText = filepath
	setFileDisplay(filepath, 'directory-display')
	setStoredItem('directory', filepath, appendVersion)
}

function setFileDisplay(str, id)
{
	if (str.length > 70)
		str = str.substr(0, 10) + '...' + str.substr(str.length-50, str.length);

	document.getElementById(id).innerText = str;
}

function fileSelected(evt)
{
	file = null
	
	if (!evt || !evt[0])
		return
	
	document.getElementById('logfile').innerText = evt[0]
	setFileDisplay(evt[0], 'logfile-display')

    // TODO:
	try {
		baFile = evt[0]
        setStoredItem("file", baFile, appendVersion)
	} catch (e) {
	}
}

function browseForLiveLogLocation()
{
	if (game.hasSingletonLogFile())
    	dialog.showOpenDialog({ properties: ['openDirectory' ]}, liveLogLocationSelected);
    else
        dialog.showOpenDialog({ properties: ['openFile' ], filters: [{ name: 'Log Files', extensions: [ game.logFileExtension() ] }] }, liveLogLocationSelected);
}

function browseForFile()
{
    file = dialog.showOpenDialog({
        properties: ['openFile' ], filters: [{ name: 'Log Files', extensions: [ game.logFileExtension() ] }]
    },
    // Callback on selection
    fileSelected)
}

function clipboardDirectorySelected([filepath])
{
	baClipboardDirectory = filepath
	document.getElementById('clipboardfile').innerText = filepath
	setFileDisplay(filepath, 'clipboard-directory')
	setStoredItem('clipboarddirectory', filepath, appendVersion)
}

function browseForClipboardDirectory()
{
	dialog.showOpenDialog({ properties: ['openDirectory' ]}, clipboardDirectorySelected);
}

function startLiveLoggingSession(description, directoryName)
{
	if (file)
		return

	if (selectedGuild == 0 && selectedRegion <= 0) {
		setErrorText(trans("no_region_selected_error"));
		file = null
		return
	}
	
	fileForDeletionAndArchival = null
	    
	setErrorText('');

	if (!directoryName) {
		setErrorText(trans("no_livelog_location_error"))
		return;
	}

	if (!fs.existsSync(directoryName)) {
        setErrorText(trans("invalid_livelog_location_error"))
		return;
	}

	file = directoryName
	
    var logFile = directoryName + (game.hasSingletonLogFile() ? "/" + game.singletonLogFileName() : '');
    var logFileExists = !game.hasSingletonLogFile() || fs.existsSync(logFile);
    
    const stats = logFileExists ? fs.statSync(logFile) : null
	liveLogPosition = stats && !game.liveLoggingMustIncludeEntireFile() ? stats.size : 0
	liveLogLastModified = stats ? stats.mtime : 0
	liveLogLastSize = stats ? stats.size : 0
	
	if (debugMode)
		logToDebugPanel("Beginning live log with position: " + liveLogPosition + " and last modified " + liveLogLastModified + ".")
	try {
		baVisibility = selectedPrivacy.toString()
		setStoredItem('visibility', baVisibility)
	} catch (e) {
	}
    
    liveLogging = true
	
	var loadingStr = spinnyGif
	document.getElementById('upload-button').innerHTML = loadingStr

    currentTimeout = setTimeout(createReport, 0)
}

function escapedISOString(date)
{
	var result = date.toISOString()
	var replacedResult = result.replace(/:/g, "-")
	return replacedResult
}

function createNewSplitFile() {
    splitFileStream && (splitFileStream.close(), splitFileStream = null);
    var e, t = file, i = t.lastIndexOf("."), o = i > -1, r = "";
    o ? (e = t.substring(0, i), r = t.substring(i)) : e = t;
    const filepath = path.resolve(e) + "-split-" + escapedISOString(new Date(splitFileTimestamp)) + r
    splitFileStream = fs.createWriteStream(filepath)
}

function splitLogFile(filename) {
	if (file)
		return

	fileForDeletionAndArchival = null

	setErrorText('');

	if (!filename) {
		setErrorText(trans("no_file_selected_error"))
		return;
	}

    file = filename
	if (!file) {
		setErrorText(trans("invalid_file_selected_error"))
		file = null
		return
	}
	
	setProgressStatusText(trans("splitting_log_file"), "logfile-progress-status")
	updateProgress(0, "logfile-progress")
	selectReportPage("progress")

	splittingLogFile = true
    currentTimeout = setTimeout(openLogFile, 0)
}

function scanLogFileForRaids(filename) {
	if (file)
		return
	
	fileForDeletionAndArchival = null
	
	setErrorText('');

	if (!filename) {
		setErrorText(trans("no_file_selected_error"))
		return;
	}

    file = filename
    const fileExists = fs.existsSync(filename)
    const fileStats = fileExists ? fs.statSync(filename) : null

	if (!fileStats || !fileExists) {
		setErrorText(trans("invalid_file_selected_error"))
		file = null
		return
	}
	
	try {
		baVisibility = selectedPrivacy.toString()
		setStoredItem('visibility', baVisibility)

		baChooseFights = document.getElementById('fight-chooser').checked ? '1' : '0'
		setStoredItem('choosefights', baChooseFights)
	} catch (e) {
	}

	setProgressStatusText(trans("scanning_log_file"), "logfile-progress-status")
	updateProgress(0, "logfile-progress")
	selectReportPage("progress")

	scanningLogFileForRaids = true 
    currentTimeout = setTimeout(openLogFile, 0)
}

function deleteLogFile() {
	var result = confirm(trans("confirm_deletion"));
    if (!result || !fileForDeletionAndArchival)
    	return
    
    try {
		fs.unlinkSync(fileForDeletionAndArchival)
        alert(trans("deletion_success"));
        fileForDeletionAndArchival = null;
    } catch (e) {
        alert(trans("deletion_failed"));
    }
}

// TODO - NOT DONE!
function archiveLogFile() {
    var result = confirm(trans("confirm_archival"));
    if (!result || !fileForDeletionAndArchival)
    	return
    try {
        var e, t = fileForDeletionAndArchival, i = t.lastIndexOf("."), o = i > -1, r = "";
		o ? (e = t.substring(0, i), r = t.substring(i)) : e = t;
		
		var l = path.dirname(fileForDeletionAndArchival)
		var fileName = e.split(path.sep).pop()
		var archiveDir = l + path.sep + game.prefix() + "logsarchive/"
		var archivedFile = archiveDir + fileName + "-archive-" + escapedISOString(new Date()) + r

		if (!fs.existsSync(archiveDir)) {
			fs.mkdirSync(archiveDir, { recursive: true })
		}
		fs.renameSync(fileForDeletionAndArchival, archivedFile)

        alert(trans("archival_success"));
		fileForDeletionAndArchival = null;
    } catch (a) {
        alert(trans("archival_failure"));
    }
}

var currentPage = "first"

function selectReportPage(page) {
	document.getElementById('report-' + currentPage + "-page").style.display = 'none'
	document.getElementById('report-' + page + "-page").style.display = 'block'
	currentPage = page
}

function setReportUIElementsVisibility(mode, visible)
{
	if (mode == "upload") {
		if (visible) {
			document.getElementById('file-chooser-description').style.display = ''
			document.getElementById('file-chooser-row').style.display = ''
			document.getElementById('fight-chooser-container').style.visibility = ''
			document.getElementById('logfile-progress-container').style.display = ''
			document.getElementById('guild-chooser-description').style.display = ''
			document.getElementById('guild-chooser-controls').style.display = ''
			document.getElementById('view-report-description').style.display = ''
			document.getElementById('view-report-container').style.display = ''
			document.getElementById('description-label').style.display = ''
		} else {
			document.getElementById('file-chooser-description').style.display = 'none'
			document.getElementById('file-chooser-row').style.display = 'none'
			document.getElementById('fight-chooser-container').style.visibility = 'hidden'
			document.getElementById('logfile-progress-container').style.display = 'none'
			document.getElementById('guild-chooser-description').style.display = 'none'
			document.getElementById('guild-chooser-controls').style.display = 'none'
			document.getElementById('view-report-description').style.display = 'none'
			document.getElementById('view-report-container').style.display = 'none'
			document.getElementById('description-label').style.display = 'none'
		}
	} else if (mode == "livelog") {
		if (visible) {
			document.getElementById('directory-chooser-description').style.display = ''
			document.getElementById('directory-chooser-row').style.display = ''
			document.getElementById('livelog-progress-status').style.display = ''
			document.getElementById('endlivelogbutton').style.display = ''
			document.getElementById('viewlivelogbutton').style.display = ''
			document.getElementById('guild-chooser-description').style.display = ''
			document.getElementById('guild-chooser-controls').style.display = ''
			document.getElementById('view-report-description').style.display = ''
			document.getElementById('view-report-container').style.display = ''
			document.getElementById('description-label').style.display = ''
		} else {
			document.getElementById('directory-chooser-description').style.display = 'none'
			document.getElementById('directory-chooser-row').style.display = 'none'
			document.getElementById('livelog-progress-status').style.display = 'none'
			document.getElementById('endlivelogbutton').style.display = 'none'
			document.getElementById('viewlivelogbutton').style.display = 'none'
			document.getElementById('guild-chooser-description').style.display = 'none'
			document.getElementById('guild-chooser-controls').style.display = 'none'
			document.getElementById('view-report-description').style.display = 'none'
			document.getElementById('view-report-container').style.display = 'none'
			document.getElementById('description-label').style.display = 'none'
		}
	} else if (mode == "split") {
		if (visible) {
			document.getElementById('split-file-chooser-description').style.display = ''
			document.getElementById('file-chooser-row').style.display = ''
			document.getElementById('logfile-progress-container').style.display = ''
			document.getElementById('description-label').style.display = 'none'
		} else {
			document.getElementById('split-file-chooser-description').style.display = 'none'
			document.getElementById('file-chooser-row').style.display = 'none'
			document.getElementById('logfile-progress-container').style.display = 'none'
			document.getElementById('description-label').style.display = ''
		}
	}
}

function setReportUIMode(mode)
{
	if (mode == reportUIMode)
		return

	setReportUIElementsVisibility(reportUIMode, false)
	reportUIMode = mode
	setReportUIElementsVisibility(reportUIMode, true)
}

function goButtonClicked()
{
	if (reportUIMode == "upload") {
		var scanForFights = document.getElementById('fight-chooser').checked
		if (scanForFights)
			scanLogFileForRaids(document.getElementById('logfile').innerText)
		else
			processLogFile(document.getElementById('description').value, document.getElementById('logfile').innerText)
	} else if (reportUIMode == "livelog")
		startLiveLoggingSession(document.getElementById('description').value, document.getElementById('directory').innerText)
	else if (reportUIMode == "split")
		splitLogFile(document.getElementById('logfile').innerText)
}

async function fightsButtonClicked()
{
	var options = document.getElementById('fights-list').options
	var selectedOptions = new Array()
	for (var i = 0; i < options.length; ++i) {
		if (options[i].selected)
			selectedOptions.push(options[i])
	}

	if (selectedOptions.length == 0) {
		setErrorText(trans("no_fight_selected"))
		return
	}
	
	var raidsToCheck = collectedScannedRaids
	await cancelOrFinish('fights') // This wipes out scannedRaids and clears raidsToUpload.
	
	for (var i = 0; i < selectedOptions.length; ++i)
		raidsToUpload.push(raidsToCheck[selectedOptions[i].value])
	
	processLogFile(document.getElementById('description').value, document.getElementById('logfile').innerText)
}

var returnPage = null

function showSelectGuildUI() {
	returnPage = currentPage
	setErrorText('')
	selectReportPage('guild')
}

function buildGuilds()
{
	document.getElementById('guilds-container').innerHTML = guildList
	
	var guildID = storedGuild != '' ? parseInt(storedGuild) : 0
	var teamID = storedTeamID != '' ? parseInt(storedTeamID) : 0
	selectGuild(guildID)
	if (teamID !== '')
		selectTeam(parseInt(teamID))
	else
		selectTeam(0)
}

var selectedGuild = undefined

function selectGuildOrRegionByTarget(event)
{
	var node = event.target
	var guildAttr = node.getAttribute("guildid")
	var regionAttr = node.getAttribute("regionid")
	var teamAttr = node.getAttribute('teamid')
	while (guildAttr === null && regionAttr === null && teamAttr === null && node) {
		node = node.parentNode
		guildAttr = node.getAttribute("guildid")
		regionAttr = node.getAttribute("regionid")
		teamAttr = node.getAttribute('teamid')
	}
	if (guildAttr !== null)
		selectGuild(parseInt(guildAttr))
	else if (regionAttr !== null)
		selectRegion(parseInt(regionAttr))
	else if (teamAttr !== null)
		selectTeam(parseInt(teamAttr))
}

function selectLanguage(languageID)
{
	if (selectedLanguage != '')
		document.getElementById('language-' + selectedLanguage).removeAttribute("selected")
	
	document.getElementById('language-' + languageID).setAttribute("selected", true)
	
	selectedLanguage = languageID
}

function selectLanguageByTarget(event)
{
	var node = event.target
	var languageAttr = node.getAttribute("languageid")
	while (languageAttr === null && node) {
		node = node.parentNode
		languageAttr = node.getAttribute("languageid")
	}
	if (languageAttr !== null)
		selectLanguage(languageAttr)
}

function selectVersion(versionID)
{
	if (selectedVersion != '')
		document.getElementById('version-' + selectedVersion).removeAttribute("selected")
	
	document.getElementById('version-' + versionID).setAttribute("selected", true)
	
	selectedVersion = versionID
}

function selectVersionByTarget(event)
{
	var node = event.target
	var versionAttr = node.getAttribute("versionid")
	while (versionAttr === null && node) {
		node = node.parentNode
		versionAttr = node.getAttribute("versionid")
	}
	if (versionAttr !== null)
		selectVersion(versionAttr)
		
	finalizeVersion();
}

function selectRegion(regionID)
{
	if (selectedRegion > 0)
		document.getElementById('region-' + selectedRegion).removeAttribute("selected")
	
	document.getElementById('region-' + regionID).setAttribute("selected", true)
	setStoredItem('region', regionID, appendVersion)

	selectedRegion = regionID
}

function selectTeam(teamID)
{
	if (selectedGuild == 0)
		return

	document.getElementById('teams-' + selectedGuild + '-' + selectedTeam).removeAttribute("selected")
	
	document.getElementById('teams-' + selectedGuild + '-' + teamID).setAttribute("selected", true)
	setStoredItem('team', teamID, appendVersion)
	
	selectedTeam = teamID
}

function selectGuild(guildID)
{
	if (selectedGuild !== undefined) {
		document.getElementById('guild-' + selectedGuild).removeAttribute("selected")
	
		// Hide that guild's raid teams.
		if (selectedGuild > 0) {
			document.getElementById('teams-' + selectedGuild).style.display = 'none'
			selectTeam(0)
		}
	}

	document.getElementById('guild-' + guildID).setAttribute("selected", true)
	
	document.getElementById('selected-guild-upload').innerHTML = document.getElementById('guild-' + guildID).innerHTML
	
	setStoredItem('guild', guildID, appendVersion)
	selectedGuild = guildID
	
	if (selectedGuild === 0)
		document.getElementById('regions').style.display = ''
	else {
		document.getElementById('regions').style.display = 'none'
		
		// Show this guild's teams.
		document.getElementById('teams-' + selectedGuild).style.display = ''
		
		selectTeam(0)
	}
}

function finalizeGuild() {
	selectReportPage(returnPage)
}

function finalizeLanguage() {
	setStoredItem("language", selectedLanguage)
	window.location.reload()
}

function finalizeVersion() {
	setStoredItem("version", selectedVersion)
	window.location.reload()
}


function showFightSelectionUI()
{
	selectReportPage('fights')
	rebuildFights()
}

function includeTrashChanged()
{
	rebuildFights()
}

function printDuration(duration)
{
	duration = Math.floor(duration / 1000)
	var result = ''
	var hours = Math.floor(duration / 3600)
	var minutes = Math.floor((duration % 3600) / 60)
	var seconds = duration % 60
	var putZeroInMinutes = false
	if (hours > 0) {
		putZeroInMinutes = true
		result += hours + ":"
	}
	result += (putZeroInMinutes && minutes < 10 ? "0" : '') + minutes + ":" + (seconds < 10 ? "0" : '') + seconds
	return result
}

function printDate(time)
{	
	var date = new Date(time)
	return date.toLocaleString()
}

function optionHovered(evt)
{
	var raid = collectedScannedRaids[this.value]
	var details = document.getElementById('fight-details')
	var result = "<b>" + htmlEntities(raid.name) + "</b><br>"
	result += "<b>" + trans("date_label") + "</b> " + printDate(raid.start) + "<br>"
	result += "<b>" + trans("duration_label") + "</b> " + printDuration(raid.end - raid.start) + "<br>"
	
	result += "<b>" + trans("friendlies_label") + "</b> "
	for (var i = 0; i < raid.friendlies.length; ++i) {
		if (i > 0)
			result += ", "
		result += htmlEntities(raid.friendlies[i])
	}
	result += "<br>"
	result += "<b>" + trans("enemies_label") + "</b> "
	for (var i = 0; i < raid.enemies.length; ++i) {
		if (i > 0)
			result += ", "
		result += htmlEntities(raid.enemies[i])
	}
	result += "<br>"
	details.innerHTML = result
}

function optionUnhovered(evt)
{
	var details = document.getElementById('fight-details')
	details.innerHTML = trans("fight_details")
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rebuildFights()
{
	var fightList = document.getElementById('fights-list')
	fightList.innerHTML = ''
	var includeTrash = document.getElementById('include-trash').checked
	for (var i = 0; i < collectedScannedRaids.length; ++i) {
		if (!includeTrash && collectedScannedRaids[i].boss == 0)
			continue
		var option = document.createElement("option")
		option.value = i
		option.onmouseover = optionHovered
		option.onmouseout = optionUnhovered
		var name = collectedScannedRaids[i].name
		if (collectedScannedRaids[i].boss > 0) {
			name += " " + game.nameForDifficulty(collectedScannedRaids[i].difficulty, collectedFights.logVersion)
			option.setAttribute('class', 'Boss')
			if (game.separatesWipesAndKills()) {
				if (!collectedScannedRaids[i].success)
					name += " " + trans("wipe")
				else
					name += " " + trans("kill")
				if (collectedScannedRaids[i].pulls > 1)
					name += "s (" + collectedScannedRaids[i].pulls + ")"
			} else
				name += " (" + collectedScannedRaids[i].pulls + ")"
		} else
			option.setAttribute('class', 'NPC')
		option.text = htmlEntities(name)
		fightList.add(option, null)
	}
}

function writeClipboardDataToFile(remainingData)
{
	var fileStreamToWrite = fs.createWriteStream(clipboardFile);
	fileStreamToWrite.write(remainingData);
	fileStreamToWrite.close();
	fileStreamToWrite = null;
}

function checkForClipboardChanges()
{
	clipboardTimeout = setTimeout(checkForClipboardChanges, 200);
	
	// FIXME: Convert to using clipboard.has() when it is no longer experimental.
	var strings = clipboard.availableFormats();
	var hasText = false;
	for (var i in strings) {
		if (strings[i] == "text/plain") {
			hasText = true;
			break;
		}
	}
	if (!hasText)
		return;
	
	var clipboardData = clipboard.readText();
	var firstNewline = clipboardData.indexOf('\n');
	if (firstNewline == -1)
		return

	var firstLine = clipboardData.substr(0, firstNewline)
	if (firstLine != "--- Rift Logs Data ---")
    	return;
	
	if (firstNewline + 1 >= clipboardData.length)
		return;
	
	var remainingData = clipboardData.substr(firstNewline + 1);
	writeClipboardDataToFile(remainingData);

	clipboard.clear();	
}

function toggleClipboardListener(directoryName) {
	if (listeningToClipboard) {
		listeningToClipboard = false
		if (clipboardTimeout) {
    		clearTimeout(clipboardTimeout)
    		clipboardTimeout = null
    	}
    	document.getElementById('clipboard-directory-file').style.opacity = ''
    	document.getElementById('toggleWriteButton').value = trans("start_recording_button")
    	clipboardFile = null
    	return
	}
	
	if (!directoryName) {
		setErrorText(trans("no_directory_error"))
		return;
	}
	
	if (!directoryName || !fs.existsSync(directoryName)) {
		setErrorText(trans("invalid_directory_error"))
		return;
	}
	
	clipboardFile = path.resolve(directoryName + "/" + game.singletonLogFileName());
	
	document.getElementById('clipboard-directory-file').style.opacity = '0.4'
    	
	clipboardTimeout = setTimeout(checkForClipboardChanges, 0)
	document.getElementById('toggleWriteButton').value = trans("stop_recording_button")
	listeningToClipboard = true
}

function ipcCollectFightsFromParser(pushFightIfNeeded, scanningOnly)
{
	return new Promise(function(resolve) {
		var parser = document.getElementById('parser')
		var eventFunc = (event) => {
			if (event.channel == "collect-fights-completed") {
				if (event.args[0] != currentIPC)
					resolve(null)
				resolve(event.args[1])
				parser.removeEventListener("ipc-message", eventFunc);
			}
		};
		parser.addEventListener('ipc-message', eventFunc);
		parser.send('collect-fights', currentIPC, pushFightIfNeeded, scanningOnly)
	});
}

function ipcCollectScannedRaidsFromParser()
{
	return new Promise(function(resolve) {
		var parser = document.getElementById('parser')
		var eventFunc = (event) => {
			if (event.channel == "collect-scanned-raids-completed") {
				if (event.args[0] != currentIPC)
					resolve(null)
				resolve(event.args[1])
				parser.removeEventListener("ipc-message", eventFunc);
			}
		};
		parser.addEventListener('ipc-message', eventFunc);
		parser.send('collect-scanned-raids', currentIPC)
	});
}

function ipcClearParserFights()
{
	return new Promise(function(resolve) {
		var parser = document.getElementById('parser')
		var eventFunc = (event) => {
			if (event.channel == "clear-fights-completed") {
				if (event.args[0] != currentIPC)
					resolve(false)
				resolve(true)
				collectedFights = { fights: new Array() };
				parser.removeEventListener("ipc-message", eventFunc);
			}
		};
		parser.addEventListener('ipc-message', eventFunc);
		parser.send('clear-fights', currentIPC, liveLogging)
	});
}

function ipcParseLogLines(lines, scanningOnly)
{  
	return new Promise(function(resolve) {
		var parser = document.getElementById('parser')
		var eventFunc = (event) => {
			if (event.channel == "parse-lines-completed") {
				if (event.args[0] != currentIPC)
					resolve({ success: false, line: "", exception: null })
				resolve(event.args[1])
				parser.removeEventListener("ipc-message", eventFunc);
			}
		};
		parser.addEventListener('ipc-message', eventFunc);
		parser.send('parse-lines', currentIPC, lines, scanningOnly, selectedRegion, raidsToUpload)
	});
}

function ipcCollectMasterFileInfo()
{
	return new Promise(function(resolve) {
		var parser = document.getElementById('parser')
		var eventFunc = (event) => {
			if (event.channel == "collect-master-info-completed") {
				if (event.args[0] != currentIPC)
					resolve(null)
				resolve(event.args[1])
				parser.removeEventListener("ipc-message", eventFunc);
			}
		};
		parser.addEventListener('ipc-message', eventFunc);
		parser.send('collect-master-info', currentIPC)
	});
}

function ipcClearParserState()
{
	return new Promise(function(resolve) {
		var parser = document.getElementById('parser')
		var eventFunc = (event) => {
			if (event.channel == "clear-state-completed") {
				if (event.args[0] != currentIPC)
					resolve(false)
				resolve(true)
				parser.removeEventListener("ipc-message", eventFunc);
			}
		};
		parser.addEventListener('ipc-message', eventFunc);
		parser.send('clear-state', currentIPC)
	});
}

function ipcGetParserVersion()
{
	return new Promise(function(resolve) {
		var parser = document.getElementById('parser')
		var eventFunc = (event) => {
			if (event.channel == "get-parser-version-completed") {
				resolve(event.args[0])
				parser.removeEventListener("ipc-message", eventFunc);
			}
		};
		parser.addEventListener('ipc-message', eventFunc);
		parser.send('get-parser-version')
	});
}

function ipcSetStartDate(startDate)
{  
	return new Promise(function(resolve) {
		var parser = document.getElementById('parser')
		var eventFunc = (event) => {
			if (event.channel == "set-start-date-completed") {
				if (event.args[0] != currentIPC)
					resolve(false)
				resolve(true)
				parser.removeEventListener("ipc-message", eventFunc);
			}
		};
		parser.addEventListener('ipc-message', eventFunc);
		parser.send('set-start-date', currentIPC, startDate)
	});
}

