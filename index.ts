import { client } from "./utils/SBClient";
import textToSpeech from "./utils/TextToSpeech";
import { processChat, processCommand } from "./utils/ChatProcessor";
import "./utils/Commands";

client.on("Twitch.RewardRedemption", async (data: any) => {
	try {
		await textToSpeech(
			`${data.data.user_name} redeemed ${data.data.reward.title}`
		);
	} catch (error) {
		console.error("Error in textToSpeech:", error);
	}
});

client.on("Twitch.ChatMessage", async (data: any) => {
	const payload = data.data;
	const source = data.event.source.toLowerCase();
	const user = payload.message.displayName;
	const msgId = payload.message.msgId;

	// check if message starts with prefix
	if (!payload.message.message.startsWith("!")) {
		await processChat(user, source, msgId);
		return;
	}

	const command = payload.message.message.substring(1).split(" ")[0];
	const message = payload.message.message.split(" ").slice(1).join(" ");

	// iterate through payload.message.badges
	// each iteration has name in an object
	// if name is "moderator" or "broadcaster", set flags.mod or flags.broadcaster to true
	const badges = payload.message.badges;

	const flags = {
		broadcaster: false,
		mod: false,
	};

	badges.forEach((badge: any) => {
		if (badge.name === "broadcaster") {
			flags.broadcaster = true;
		} else if (badge.name === "moderator") {
			flags.mod = true;
		}
	});

	await processCommand(user, command, message, flags, source, msgId);
});

client.on("YouTube.Message", async (data: any) => {
	const payload = data.data;
	const source = data.event.source.toLowerCase();
	const user = payload.user.name;

	// check if message starts with prefix
	if (!payload.message.startsWith("!")) {
		await processChat(user, source);
		return;
	}

	const command = payload.message.substring(1).split(" ")[0];

	// remove first word from message
	const message = payload.message.split(" ").slice(1).join(" ");

	// set flags
	const flags = {
		broadcaster: payload.user.isOwner,
		mod: payload.user.isModerator,
	};

	await processCommand(user, command, message, flags, source);
});
