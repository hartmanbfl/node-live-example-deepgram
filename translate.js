const translate = require('google-translate-api-x');

async function translateText(lang, text) {
    const translated = await translate(text, { to: lang });
    console.log(`Translated text: ${translated.text}`);
    return translated.text;
}

module.exports = {
    translateText
}