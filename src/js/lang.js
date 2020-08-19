var lang = { };

function loadLocaleJSON() {
	const enLangFile = path.join(path.dirname(__dirname), '/locales','client.json');
	lang.en = JSON.parse(fs.readFileSync(enLangFile, 'utf-8').toString())
	
	if (storedLanguage != "en") {
		try {
			const specificLangFile = path.join(path.dirname(__dirname), '/locales','client-' + storedLanguage + '.json');
			lang[storedLanguage] = JSON.parse(fs.readFileSync(specificLangFile, 'utf-8').toString())
		} catch (e) {  }
	}
}

function trans(key) {
	if (lang[storedLanguage] && lang[storedLanguage][key])
		return lang[storedLanguage][key];
	return lang['en'][key]
}