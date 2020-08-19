class Game {
	prefix() { 
		return "swtor";
	}
	
	site(locale, version) {
		return locale + ".swtorlogs.com";
	}
	
	hasSingletonLogFile() {
		return false;
	}
	
	singletonLogFileName() {
		throw "This game does not support singleton log files.";
	}
	
	logFileExtension() {
		return "txt";
	}
	
	liveLoggingMustIncludeEntireFile() {
		return true;
	}
	
	liveLoggingChecksLastModified() {
		return true
	}
	
	defaultRegion() {
		return 1
	}

	versions() { return null; }
	
	nameForDifficulty(difficulty, logVersion) {
		return "";
	}

	separatesWipesAndKills() {
		return false;
	}
	
	splitsOnTimestamps() {
		return true;
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
		return 0
	}

	modifyVersionForLanguage(version, lang) { return version; }
	
	logFileEncoding() { return "latin1"; }
	
	locales() {
		return { "de": "Deutsch",
			 "en": "English",
			 "fr": "Français"
		};
	}
	
	fileStartDate(filename) {
		let result = ''
		if (!filename)
			return result
		let splitFile = filename.split('_')
		if (splitFile.length < 6)
			return ''
		let date = splitFile[1].split('-')
		if (date.length < 3)
			return ''
		result = date[1] + '/' + date[2] + '/' + date[0]
		return result
	}
}
