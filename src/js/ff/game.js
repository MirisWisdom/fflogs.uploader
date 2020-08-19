class Game {
	prefix() { 
		return "ff";
	}

	site(locale, version) {
		return locale + ".fflogs.com";
	}
	
	hasSingletonLogFile() {
		return false;
	}
	
	singletonLogFileName() {
		throw "This game does not support singleton log files.";
	}
	
	logFileExtension() {
		return "log";
	}
	
	liveLoggingMustIncludeEntireFile() {
		return true;
	}
	
	liveLoggingChecksLastModified() {
		return false
	}
	
	logFileEncoding() { return "utf8"; }
	
	defaultRegion() {
		return 0
	}
	
	versions() { return null; }
	
	nameForDifficulty(difficulty, logVersion) {
		return ''
	}
	
	separatesWipesAndKills() {
		return false;
	}
	
	splitsOnTimestamps() {
		return true;
	}
	
	splitsOnZoneChanges() {
		return true;
	}
	
	contentLoaded() {
		var versionInfo = document.getElementById('version-info');
		versionInfo.innerHTML = trans("ff_act_warning");
		
		document.getElementById('include-trash-container').style.display = 'none'
	}
	
	usesClipboard() {
		return false;
	}
	
	scanLogLine(line)
	{
		var restOfEventLine = line.split('|');
		if (restOfEventLine.length < 2)
			return -1
		
		// Now get the event type.
		var eventTypeString = restOfEventLine[0]
		var type = parseInt(eventTypeString)
		
		var dateString = restOfEventLine[1]
		if (!dateString.length)
			return -1
		
		var date = game.parseISO8601Date(dateString)
		if (!date)
			return -1 // Just ignore the event completely if there is a bogus date.
		
		if (type == 1)
			splitZoneID = parseInt(restOfEventLine[2], 16)
	
		return date.getTime()
	}
	
	parseISO8601Date(s)
	{
		// parenthese matches:
		// year month day    hours minutes seconds  
		// dotmilliseconds 
		// tzstring plusminus hours minutes
		var re = /(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(\.\d+)?(Z|([+-])(\d\d):(\d\d))/;
		
		var d = [];
		d = s.match(re);
		
		// "2010-12-07T11:00:00.000-09:00" parses to:
		//  ["2010-12-07T11:00:00.000-09:00", "2010", "12", "07", "11",
		//     "00", "00", ".000", "-09:00", "-", "09", "00"]
		// "2010-12-07T11:00:00.000Z" parses to:
		//  ["2010-12-07T11:00:00.000Z",      "2010", "12", "07", "11", 
		//     "00", "00", ".000", "Z", undefined, undefined, undefined]
		
		if (!d)
			return null
		
		// parse strings, leading zeros into proper ints
		var a = [1,2,3,4,5,6,10,11];
		for (var i in a) {
			d[a[i]] = parseInt(d[a[i]], 10);
		}
		d[7] = parseFloat(d[7]);
		
		// Date.UTC(year, month[, date[, hrs[, min[, sec[, ms]]]]])
		// note that month is 0-11, not 1-12
		// see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date/UTC
		var ms = Date.UTC(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
		
		// if there are milliseconds, add them
		if (d[7] > 0) {  
			ms += Math.round(d[7] * 1000);
		}
		
		// if there's a timezone, calculate it
		if (d[8] != "Z" && d[10]) {
			var offset = d[10] * 60 * 60 * 1000;
			if (d[11]) {
			  offset += d[11] * 60 * 1000;
			}
			if (d[9] == "+") {
			  ms -= offset;
			}
			else {
			  ms += offset;
			}
		}
		
		return new Date(ms);
	}
	
	modifyVersionForLanguage(version, lang) { 
		if (lang == "cn")
			return version + "-cn"; 
		if (lang == "ko")
			return version + "-ko";
		return version;
	}
	
	locales() {
		return { "de": "Deutsch",
			 "en": "English" ,
			 "fr": "Français" ,
			 "ja": "日本語" ,
			 "ko": "한국어" ,
			 "cn": "简体中文" 
		};
	}
	
	fileStartDate(filename) { return '' }
}
