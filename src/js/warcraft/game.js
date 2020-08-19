class Game {
	prefix() { 
		return "warcraft";
	}
	
	site(locale, version) {
		if (locale == "www" && version == "classic")
			return "classic.warcraftlogs.com"
		return locale + (version == "classic" ? ".classic" : "") + ".warcraftlogs.com";
	}
	
	hasSingletonLogFile() {
		return true;
	}
	
	singletonLogFileName() {
		return "WoWCombatLog.txt";
	}
	
	logFileExtension() {
		return "txt";
	}
	
	liveLoggingMustIncludeEntireFile() {
		return false;
	}

	liveLoggingChecksLastModified() {
		return true
	}
	
	logFileEncoding() { return "utf8"; }
	
	defaultRegion() {
		return 0
	}
	
	versions() { return { "live": "live_version", "classic": "classic_version", "test": "test_version" }; }
	
	modifyVersionForLanguage(version, lang) { return version; }
	
	nameForDifficulty(difficulty, logVersion) {
		if (difficulty == 16)
			return trans("warcraft_difficulty_mythic")
		if (difficulty == 7 || difficulty == 17)
			return trans("warcraft_difficulty_lfr")
		if (difficulty == 14)
			return logVersion == 1 ? trans("warcraft_difficulty_flex") : trans("warcraft_difficulty_normal")
		if (difficulty == 15)
			return trans("warcraft_difficulty_heroic")	
		if (difficulty == 8)
			return logVersion >= 7 ? trans("warcraft_difficulty_mythic_plus") : trans("warcraft_difficulty_challenge_mode")
		if (difficulty == 1 || difficulty == 3 || difficulty == 4 || difficulty == 12 || difficulty == 9)
			return trans("warcraft_difficulty_normal")
		if (difficulty == 2 || difficulty == 5 || difficulty == 6 || difficulty == 11)
			return trans("warxraft_difficulty_heroic")
		return "";
	}

	separatesWipesAndKills() {
		return true;
	}
	
	splitsOnTimestamps() {
		return true;
	}
	
	splitsOnZoneChanges() {
		return true;
	}
	
	contentLoaded() {
		// FIXME: So gross.
		var titleIfText = document.getElementById('title-if-text');
		titleIfText.innerHTML = '<span id="title-top"><span id="title-top-first">WARCRAFT</span> <span id="title-top-second">LOGS </span></span><span id="title-bottom"><span id="title-bottom-interior" style=""><span id="title-bottom-first">WARCRAFT</span> <span id="title-bottom-second" style="">LOGS</span></span></span>';
	}
	
	usesClipboard() {
		return false;
	}
	
	adjustTimeForYearCrossingAndDaylightSavings(line, dateString, timeSplit)
	{
		if (!splitYearSet)
			splitYear = new Date().getFullYear()
	
		var date = new Date(dateString + "/" + splitYear + " " + timeSplit[0])
		date.setMilliseconds(timeSplit[1])
	
		if (!splitYearSet) {
			while ((date.getTime() - new Date().getTime()) > 0) {
				// We're in the future. This is no good. Rewind to the previous year.
				splitYear--;
				date = new Date(dateString + "/" + splitYear + " " + timeSplit[0])
				date.setMilliseconds(timeSplit[1])
			}
			splitYearSet = true
		}
	
		var currTime = date.getTime()
		if (currTime >= previousSplitTime)
			return currTime
	
		date = new Date(dateString + "/" + (splitYear + 1) + " " + timeSplit[0])
		date.setMilliseconds(timeSplit[1])
		if (date.getTime()  - new Date().getTime() <= 0) {
			// Not in the future, so it's ok to go forward now.
			splitYear++
			currTime = date.getTime()
			daylightSavingsSplitShift = 0
		} else {
			// We went backwards in time. Biggest reason for this is daylight savings.
			while (currTime + daylightSavingsSplitShift < previousSplitTime)
				daylightSavingsSplitShift += 3600000 // 1 hour in milliseconds
		}
	
		return currTime
	}

	scanLogLine(line)
	{
		// Get the timestamp, which includes the date in milliseconds.
		var dateEnd = line.indexOf(" ")
		if (dateEnd == -1)
			return -1
		
		var dateString = line.substr(0, dateEnd)
		if (!dateString.length)
			return -1
	
		var timeEnd = line.indexOf("  ", dateEnd)
		if (timeEnd == -1 || timeEnd < dateEnd + 1)
			return -1
	
		var timeStringWithMilliseconds = line.substr(dateEnd + 1, timeEnd - dateEnd - 1)
		
		// Split the time string into the time without milliseconds and the milliseconds.
		var timeSplit = timeStringWithMilliseconds.split('.')
		if (timeSplit.length != 2)
			return -1
		
		var currTime = game.adjustTimeForYearCrossingAndDaylightSavings(line, dateString, timeSplit)
		previousSplitTime = currTime
		return currTime + daylightSavingsSplitShift
	}

	locales() {
		return { "de": "Deutsch",
			 "en": "English" ,
			 "es": "Español" ,
			 "fr": "Français" ,
			 "it": "Italiano" ,
			 "br": "Português (Brasil)" ,
			 "ru": "Русский" ,
			 "ko": "한국어" ,
			 "tw": "繁體中文" ,
			 "cn": "简体中文" 
		};
	}
	
	fileStartDate(filename) { return '' }
}
