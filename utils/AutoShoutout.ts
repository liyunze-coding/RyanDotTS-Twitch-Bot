import { addToTextFile, getTextFileContent } from "./Commands";
import { sendChatResponse } from "./ChatProcessor";

const STREAMERS = await getTextFileContent("streamers_to_shoutout");

type ChatCountType = {
	[key: string]: number;
};

const NUMBER_OF_CHATS_BEFORE_SHOUTOUT = 2; // 3 times

let chatCount: ChatCountType = {};

export async function processAutoShoutout(username: string) {
	// if streamer is in the list AND has chatted X times, then auto shoutout
	username = username.toLowerCase();
	if (STREAMERS.includes(username)) {
		if (!chatCount[username]) {
			chatCount[username] = 0;
		}

		if (chatCount[username] < NUMBER_OF_CHATS_BEFORE_SHOUTOUT) {
			chatCount[username]++;
		} else if (chatCount[username] == NUMBER_OF_CHATS_BEFORE_SHOUTOUT) {
			// Do shoutout
			chatCount[username]++;

			if (username === "studyyoulazy") {
				await sendChatResponse(`!lazy`, "Twitch");
			} else {
				await sendChatResponse(`!so @${username}`, "Twitch");
			}
		}
	}
}

export async function onShoutout(username: string) {
	// if streamer is in the list, then remove from list
	username = username.toLowerCase();
	if (STREAMERS.includes(username)) {
		if (!chatCount[username]) {
			chatCount[username] = 0;
		}

		chatCount[username] += NUMBER_OF_CHATS_BEFORE_SHOUTOUT + 1;
	}
}

export async function addToShoutout(username: string) {
	await addToTextFile("streamers_to_shoutout", username);
}
