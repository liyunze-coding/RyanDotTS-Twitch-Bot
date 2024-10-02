import axios from "axios";

export async function lookUpDefinition(word: string) {
	const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
	const definitions = await axios.get(url);
	const meanings = definitions.data[0].meanings;

	let response = `${word}: `;

	meanings.forEach((meaning: any) => {
		response += `${meaning.partOfSpeech}: ${meaning.definitions[0].definition} `;
	});

	return response;
}
