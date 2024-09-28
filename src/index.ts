import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import * as dotenv from "dotenv";
import path from "path";
import say from "say";
import { fileURLToPath } from "url";
import { StreamerbotClient } from "@streamerbot/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: __dirname + "/../.env" });

const WEBHOOK_URL = process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL : "";

const commandList = ["ryancommand", "ryancmd", "rcmd"];
const broadcasterCommandList = [
	"broadcastercommand",
	"bcmd",
	"mcmd",
	"modcommand",
];

const addCommands = ["add"];
const editCommands = ["edit"];
const deleteCommands = ["remove", "delete", "del"];

// text files
const compliments: string[] = fs
	.readFileSync(__dirname + "/../text_files/compliments.txt", "utf8")
	.replace(/\r/g, "")
	.split("\n");

const quotes: string[] = fs
	.readFileSync(__dirname + "/../text_files/quotes.txt", "utf8")
	.replace(/\r/g, "")
	.split("\n");

const timerMessages: string[] = fs
	.readFileSync(__dirname + "/../text_files/timer_messages.txt", "utf8")
	.replace(/\r/g, "")
	.split("\n");

const randomAutoResponse = ["compliment", "quote", "timer"] as const;

interface Commands {
	[key: string]: string;
}

let commands: Commands = {};
let broadcasterCommands: Commands = {};
let streamers: { [key: string]: boolean } = {};

try {
	const commandsFile = fs.readFileSync("json_files/commands.json", "utf-8");
	const broadcasterCommandsFile = fs.readFileSync(
		"json_files/broadcaster_commands.json",
		"utf-8"
	);

	commands = JSON.parse(commandsFile);
	broadcasterCommands = JSON.parse(broadcasterCommandsFile);
} catch (err) {
	console.error(`Error reading commands file: ${err}`);
}

const client = new StreamerbotClient({
	host: "127.0.0.1",
	port: 6968,
	endpoint: "/",
	subscribe: {
		YouTube: ["Message"],
		Twitch: ["ChatMessage", "RewardRedemption"],
	},
	onData: onData,
});

async function sendChatResponse(response: string, source: string) {
	if (source === "youtube") {
		// const streamerYTBotResponse =
		await client.doAction("390ff8f2-7945-4eba-be2a-a1c0e4ba535d", {
			response: response,
		});

		// console.log(streamerYTBotResponse);
	} else {
		// const streamerTwitchBotResponse =
		await client.doAction("8ff809be-e269-4f06-9528-021ef58df436", {
			response: response,
		});

		// console.log(streamerTwitchBotResponse);
	}
}

const sendWebHook = async (url: string, data: any) => {
	const form = new FormData();

	form.append("payload_json", JSON.stringify(data));

	try {
		await axios.post(url, form, {
			headers: form.getHeaders(),
		});
	} catch (error) {
		console.error("Error sending webhook:", error);
	}
};

// modify json files

// commands
function addCommand(command: string, reply: string) {
	commands[command] = reply;
	fs.writeFileSync("json_files/commands.json", JSON.stringify(commands));
}

function editCommand(command: string, reply: string) {
	commands[command] = reply;
	fs.writeFileSync("json_files/commands.json", JSON.stringify(commands));
}

function deleteCommand(command: string) {
	delete commands[command];
	fs.writeFileSync("json_files/commands.json", JSON.stringify(commands));
}

// broadcaster commands
function addBroadcasterCommand(command: string, reply: string) {
	broadcasterCommands[command] = reply;
	fs.writeFileSync(
		"json_files/broadcaster_commands.json",
		JSON.stringify(broadcasterCommands)
	);
}

function editBroadcasterCommand(command: string, reply: string) {
	broadcasterCommands[command] = reply;
	fs.writeFileSync(
		"json_files/broadcaster_commands.json",
		JSON.stringify(broadcasterCommands)
	);
}

function deleteBroadcasterCommand(command: string) {
	delete broadcasterCommands[command];
	fs.writeFileSync(
		"json_files/broadcaster_commands.json",
		JSON.stringify(broadcasterCommands)
	);
}

// send a quote, compliment, or timer message
function activateTimerMessages(user: string) {
	// quote, compliment, or timer message
	let autoresponder =
		randomAutoResponse[
			Math.floor(Math.random() * randomAutoResponse.length)
		];

	if (autoresponder === "compliment") {
		let randomCompliment =
			compliments[Math.floor(Math.random() * compliments.length)];

		// Send a random compliment to the chat

		sendChatResponse(`@${user} ${randomCompliment}`, "twitch");
	} else if (autoresponder === "quote") {
		let randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

		// Send a random quote to the chat

		sendChatResponse(`${randomQuote}`, "twitch");
	} else if (autoresponder === "timer") {
		let randomTimerMessage =
			timerMessages[Math.floor(Math.random() * timerMessages.length)];

		// Send a random timer message to the chat

		sendChatResponse(`${randomTimerMessage}`, "twitch");
	}
}

/**
 * Handles incoming data, processes it if it's a YouTube message event.
 *
 * @param {Object} data - The incoming data object.
 * @param {Object} data.event - The event details.
 * @param {string} data.event.source - The source of the event.
 * @param {string} data.event.type - The type of the event.
 * @param {Object} data.data - The payload of the event.
 * @param {string} data.data.message - The message from the event.
 * @param {Object} data.data.user - The user who triggered the event.
 * @param {string} data.data.user.name - The name of the user.
 * @param {boolean} data.data.user.isOwner - Flag indicating if the user is the owner.
 * @param {boolean} data.data.user.isModerator - Flag indicating if the user is a moderator.
 */
function onData(data: any) {
	if (!data.event) return;
	if (data.event.source === "YouTube" && data.event.type === "Message") {
		const payload = data.data;
		const source = data.event.source.toLowerCase();
		const user = payload.user.name;

		// check if message starts with prefix
		if (!payload.message.startsWith("!")) {
			processChat(user, source);
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

		processCommand(user, command, message, flags, source);
	} else if (
		data.event.source === "Twitch" &&
		data.event.type === "ChatMessage"
	) {
		const payload = data.data;
		const source = data.event.source.toLowerCase();
		const user = payload.message.displayName;

		// check if message starts with prefix
		if (!payload.message.message.startsWith("!")) {
			processChat(user, source);
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

		processCommand(user, command, message, flags, source);
	} else if (
		data.event.source === "Twitch" &&
		data.event.type === "RewardRedemption"
	) {
		textToSpeech(
			`${data.data.user_name} redeemed ${data.data.reward.title}`
		);
	}
}

function processCommand(
	user: string,
	command: string,
	message: string,
	flags: any,
	source: string
) {
	// Check if the command exists in the regular commands object
	if (commands[command]) {
		let reply = commands[command];
		const mention = message.split(" ")[0];
		reply = reply.replace("{user}", `@${user}`);
		reply = reply.replace("{mention}", `${mention}`);

		sendChatResponse(reply, source);
	}
	// Check if the command exists in the broadcaster commands object and the user is a broadcaster or mod
	else if (broadcasterCommands[command] && (flags.broadcaster || flags.mod)) {
		let reply = broadcasterCommands[command];
		const mention = message.split(" ")[0];
		reply = reply.replace("{user}", `@${user}`);
		reply = reply.replace("{mention}", `${mention}`);

		sendChatResponse(reply, source);
	}
	// Handle the "time" command
	else if (command === "time") {
		let d = new Date();
		let localtime = d.toLocaleTimeString("en-US", { hour12: true });

		sendChatResponse(`${user} it is currently ${localtime}`, source);
	}
	// Handle the "promote" command if the user is a broadcaster
	else if (command === "promote" && flags.broadcaster) {
		let content_of_promotion = `<@&1038436118816903210> \n# <https://www.twitch.tv/RythonDev>\n${message}`;

		// Send a webhook to promote the channel
		sendWebHook(WEBHOOK_URL, {
			content: content_of_promotion,
		});

		sendChatResponse(`${user} promotion successful!`, source);
	}
	// Handle the "compliment" command
	else if (command === "compliment") {
		let compliment_user = `@${user}`;

		if (message.includes("@")) {
			const match = message.match(/(@[^\s]+)/g);
			compliment_user = match ? match[0] : "";
		}

		let random_compliment =
			compliments[Math.floor(Math.random() * compliments.length)];

		sendChatResponse(`${compliment_user} ${random_compliment}`, source);
	}
	// Handle the "quote" command
	else if (command === "quote") {
		let random_quote = quotes[Math.floor(Math.random() * quotes.length)];

		sendChatResponse(`${random_quote}`, source);
	}
	// Handle the "addcommand" command if the user is a broadcaster
	else if (
		commandList.includes(command) &&
		addCommands.includes(message.split(" ")[0]) &&
		(flags.broadcaster || flags.moderator)
	) {
		// example: !command add !hello Hello, {user}!
		let command_to_add = message.split(" ")[1];
		let reply = message.split(" ").slice(2).join(" ");

		// remove exclamation mark if it exists
		if (command_to_add.includes("!")) {
			command_to_add = command_to_add.replace("!", "");
		}

		// if command already exists, return
		if (commands[command_to_add]) {
			// Send a confirmation message to the chat

			sendChatResponse(
				`${user} command '${command_to_add}' already exists! Please use the edit command instead.`,
				source
			);
			return;
		}

		// Add the command to the commands object
		addCommand(command_to_add, reply);

		// Send a confirmation message to the chat

		sendChatResponse(
			`${user} command '${command_to_add}' added successfully!`,
			source
		);
	}
	// Handle the "editcommand" command if the user is a broadcaster
	else if (
		commandList.includes(command) &&
		editCommands.includes(message.split(" ")[0]) &&
		flags.broadcaster
	) {
		// example: !command edit !hello Hello, {user}! I'm glad you're here!
		let command_to_edit = message.split(" ")[1];
		let reply = message.split(" ").slice(2).join(" ");

		// remove exclamation mark if it exists
		if (command_to_edit.includes("!")) {
			command_to_edit = command_to_edit.replace("!", "");
		}

		// if command doesn't exist, return
		if (!commands[command_to_edit]) {
			// Send a confirmation message to the chat

			sendChatResponse(
				`${user} command '${command_to_edit}' doesn't exist! Please use the add command instead.`,
				source
			);
			return;
		}

		// Edit the command in the commands object
		editCommand(command_to_edit, reply);

		// Send a confirmation message to the chat

		sendChatResponse(
			`${user} command '${command_to_edit}' edited successfully!`,
			source
		);
	}
	// Handle the "deletecommand" command if the user is a broadcaster
	else if (
		commandList.includes(command) &&
		deleteCommands.includes(message.split(" ")[0]) &&
		flags.broadcaster
	) {
		// example: !command delete !hello
		let command_to_delete = message.split(" ")[1];

		// remove exclamation mark if it exists
		if (command_to_delete.includes("!")) {
			command_to_delete = command_to_delete.replace("!", "");
		}

		// if command doesn't exist, return
		if (!commands[command_to_delete]) {
			// Send a confirmation message to the chat

			sendChatResponse(
				`${user} command '${command_to_delete}' doesn't exist!`,
				source
			);
			return;
		}

		// Delete the command from the commands object
		deleteCommand(command_to_delete);

		// Send a confirmation message to the chat

		sendChatResponse(
			`${user} command '${command_to_delete}' deleted successfully!`,
			source
		);
	}
	// Handle the "addbroadcastercommand" command if the user is a broadcaster
	else if (
		broadcasterCommandList.includes(command) &&
		addCommands.includes(message.split(" ")[0]) &&
		flags.broadcaster
	) {
		// example: !broadcastercommand add !hello Hello, {user}!
		let command_to_add = message.split(" ")[1];
		let reply = message.split(" ").slice(2).join(" ");

		// remove exclamation mark if it exists
		if (command_to_add.includes("!")) {
			command_to_add = command_to_add.replace("!", "");
		}

		// Add the command to the broadcaster commands object
		addBroadcasterCommand(command_to_add, reply);

		// Send a confirmation message to the chat

		sendChatResponse(
			`${user} broadcaster command '${command_to_add}' added successfully!`,
			source
		);
	}
	// Handle the "editbroadcastercommand" command if the user is a broadcaster
	else if (
		broadcasterCommandList.includes(command) &&
		editCommands.includes(message.split(" ")[0]) &&
		flags.broadcaster
	) {
		// example: !broadcastercommand edit !hello Hello, {user}! I'm glad you're here!
		let command_to_edit = message.split(" ")[1];
		let reply = message.split(" ").slice(2).join(" ");

		// remove exclamation mark if it exists
		if (command_to_edit.includes("!")) {
			command_to_edit = command_to_edit.replace("!", "");
		}

		// Edit the command in the broadcaster commands object
		editBroadcasterCommand(command_to_edit, reply);

		// Send a confirmation message to the chat

		sendChatResponse(
			`${user} broadcaster command '${command_to_edit}' edited successfully!`,
			source
		);
	}
	// Handle the "deletebroadcastercommand" command if the user is a broadcaster
	else if (
		broadcasterCommandList.includes(command) &&
		deleteCommands.includes(message.split(" ")[0]) &&
		flags.broadcaster
	) {
		// example: !broadcastercommand delete !hello
		let command_to_delete = message.split(" ")[1];

		// remove exclamation mark if it exists
		if (command_to_delete.includes("!")) {
			command_to_delete = command_to_delete.replace("!", "");
		}

		// Delete the command from the broadcaster commands object
		deleteBroadcasterCommand(command_to_delete);

		// Send a confirmation message to the chat

		sendChatResponse(
			`${user} broadcaster command '${command_to_delete}' deleted successfully!`,
			source
		);
	} else if (["define", "definition"].includes(command)) {
		const word = message.split(" ")[0];

		lookUpDefinition(word).then((definition) => {
			sendChatResponse(definition, source);
		});
	} else if (["convert"].includes(command)) {
		let response = "";

		response = convert(message);

		sendChatResponse(response, source);
	}
}

let messageCount: number = 0;
let lastMessageTimestamp: number = Date.now();
let timeLimit = 5 * 60 * 1000; // 5 minutes
let messageLimit = 10;

function processChat(user: string, source: string) {
	if (
		[
			"ryandotts",
			"rythondev",
			"mohcitrus",
			"sery_bot",
			"kofistreambot",
		].includes(user.toLowerCase()) ||
		source === "youtube"
	) {
		return;
	}

	if (
		messageCount >= messageLimit &&
		Date.now() - lastMessageTimestamp >= timeLimit
	) {
		activateTimerMessages(user);
		messageCount = 0;
		lastMessageTimestamp = Date.now();
	} else {
		messageCount++;
	}
}

const textToSpeech = (text: string) => {
	say.speak(text);
};

async function lookUpDefinition(word: string) {
	const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
	const definitions: any = await axios.get(url);
	const meanings = definitions.data[0].meanings;

	let response = `${word}: `;

	meanings.forEach((meaning: any) => {
		response += `${meaning.partOfSpeech}: ${meaning.definitions[0].definition} `;
	});

	return response;
}

// Conversion functions
function convertLength(value: number, unit: string): number {
	switch (unit) {
		case "ft":
		case "'":
			return value * 0.3048; // feet to meters
		case "inch":
		case '"':
			return value * 0.0254; // inches to meters
		case "m":
			return value; // meters to meters
		default:
			throw new Error(`Unsupported length unit: ${unit}`);
	}
}

function convertSpeed(value: number, unit: string): number {
	switch (unit) {
		case "mph":
			return value * 0.44704; // miles per hour to meters per second
		case "kph":
			return value / 3.6; // kilometers per hour to meters per second
		case "m/s":
			return value; // meters per second to meters per second
		default:
			throw new Error(`Unsupported speed unit: ${unit}`);
	}
}

function convertVolume(value: number, unit: string): number {
	switch (unit) {
		case "gallon":
		case "gal":
			return value * 3.78541; // gallons to liters
		case "litre":
		case "liter":
		case "l":
			return value; // liters to liters
		default:
			throw new Error(`Unsupported volume unit: ${unit}`);
	}
}

function convertTemperature(value: number, unit: string): number {
	switch (unit) {
		case "F":
			return ((value - 32) * 5) / 9; // Fahrenheit to Celsius
		case "C":
			return value; // Celsius to Celsius
		default:
			throw new Error(`Unsupported temperature unit: ${unit}`);
	}
}

// Main conversion function
function convert(input: string): string {
	const lengthPattern = /^(0|[1-9][0-9]*)\s*(ft|\'|inch|\"|m)$/;
	const speedPattern = /^(0|[1-9][0-9]*)\s*(mph|kph|m\/s)$/;
	const volumePattern = /^(0|[1-9][0-9]*)\s*(gallon|gal|litre|liter|l)$/;
	const temperaturePattern = /^(0|[1-9][0-9]*)\s*(F|C)$/;

	let match = input.match(lengthPattern);
	if (match) {
		const value = parseFloat(match[1]);
		const unit = match[2];
		return `${convertLength(value, unit)} meters`;
	}

	match = input.match(speedPattern);
	if (match) {
		const value = parseFloat(match[1]);
		const unit = match[2];
		return `${convertSpeed(value, unit)} meters per second`;
	}

	match = input.match(volumePattern);
	if (match) {
		const value = parseFloat(match[1]);
		const unit = match[2];
		return `${convertVolume(value, unit)} liters`;
	}

	match = input.match(temperaturePattern);
	if (match) {
		const value = parseFloat(match[1]);
		const unit = match[2];
		return `${convertTemperature(value, unit)} Celsius`;
	}

	return `Unsupported input: ${input}`;
}
