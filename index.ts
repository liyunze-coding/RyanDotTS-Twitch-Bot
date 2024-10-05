import { client } from "./utils/SBClient";
import textToSpeech from "./utils/TextToSpeech";
import { processChat, processCommand } from "./utils/ChatProcessor";
import { sendEmbedWebHook } from "./utils/DiscordWebHook";
import { getProfileURL, getVODTimestamp } from "./utils/TwitchAPI";

client.on("Twitch.RewardRedemption", async (data: any) => {
	try {
		let username = data.data.user_name;
		let reward = data.data.reward;

		let userInput = data.data.user_input ?? "";

		let response = `${username} redeemed ${reward.title}`;

		if (userInput) {
			response += ` with message: ${userInput}`;
		}

		// Check if it's the other TTS reward
		if (reward.id !== "8dc5018c-039d-4ec9-b818-6c8eaaa5a7a1") {
			// Send TTS message to broadcaster only
			await textToSpeech(response);
		}

		// Send message to Discord with VOD Timestamp
		let timestampedURL = await getVODTimestamp("248474026");
		console.log(timestampedURL);

		let profileURL = await getProfileURL(data.data.user_id);

		await sendEmbedWebHook(
			"https://discord.com/api/webhooks/1065413606080004217/S6M4YsBJZugNERrkZ8OWpuGj-Oee1NTHNUiPgjoltKUpWp-heaigMd5Ix5mI1671CdAE",
			{
				description: `**${username}** redeemed **${
					reward.title
				}** for ${reward.cost}\n${
					userInput
						? `\`\`\`\n${userInput}\n\`\`\`
					`
						: ""
				}`,
				message: timestampedURL,
				author: username,
				author_url: profileURL,
			}
		);
	} catch (error) {
		console.error("Error:", error);
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
