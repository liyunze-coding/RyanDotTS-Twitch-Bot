import axios from "axios";

export async function lookUpDefinition(word: string) {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
    try {
        const definitions = await axios.get(url);
        const meanings = definitions.data[0]?.meanings;

        if (!meanings || meanings.length === 0) {
            return `No definitions found for "${word}".`;
        }

        let response = `${word}: `;

        meanings.forEach((meaning: any) => {
            if (meaning.definitions && meaning.definitions[0]) {
                response += `${meaning.partOfSpeech}: ${meaning.definitions[0].definition} `;
            }
        });

        return response.trim();
    } catch (error: any) {
        return `Error fetching definition for "${word}".`;
    }
}