class Game {
	prefix() { 
		return "eso";
	}
	
	site(locale, version) {
		return locale + ".esologs.com";
	}
	
	hasSingletonLogFile() {
		return true;
	}
	
	singletonLogFileName() {
		return "Encounter.log";
	}
	
	logFileExtension() {
		return "log";
	}
	
	liveLoggingMustIncludeEntireFile() {
		return false;
	}
	
	liveLoggingChecksLastModified() {
		return true
	}
	
	logFileEncoding() { return "utf8"; }
	
	defaultRegion() {
		return 1
	}

	versions() { return null; }
	
	nameForDifficulty(difficulty, logVersion) {
		return "";
	}

	separatesWipesAndKills() {
		return true;
	}
	
	splitsOnTimestamps() {
		return false;
	}
	
	splitsOnZoneChanges() {
		return false;
	}
	
	contentLoaded() {
		document.getElementById('include-trash-container').style.display = 'none'
	}
	
	usesClipboard() {
		return false;
	}
	
	scanLogLine(line)
	{
		var restOfEventLine = line.split(',');
		if (restOfEventLine.length < 2)
			return -1
		
		// Now get the event type.
		var eventTypeString = restOfEventLine[1]
		if (eventTypeString == "BEGIN_LOG")
			return -2 // Signal a split.
		
		return 0
	}

	modifyVersionForLanguage(version, lang) { return version; }
	
	locales() {
		return { "de": "Deutsch",
			 "en": "English",
			 "es": "Español" ,
			 "fr": "Français",
			 "it": "Italiano",
			 "ru": "Русский",
			 "ja": "日本語",
			 "cn": "简体中文" 
		};
	}
	
	fileStartDate(filename) { return '' }
}
