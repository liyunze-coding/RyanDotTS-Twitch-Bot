import ComfyJS from "comfy.js";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import say from "say";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: __dirname + "/../.env" });

const CLIENT_ID = process.env.CLIENT_ID ? process.env.CLIENT_ID : "";
const CLIENT_TOKEN = process.env.CLIENT_TOKEN ? process.env.CLIENT_TOKEN : "";
const WEBHOOK_URL = process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL : "";
const STREAMER = process.env.STREAMER ? process.env.STREAMER : "";
const BOT_NAME = process.env.BOT_NAME ? process.env.BOT_NAME : "";
const CLIP_URL = process.env.CLIP_URL ? process.env.CLIP_URL : "";

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

// remove \r from file
const streamers_to_shoutout: string[] = fs
	.readFileSync(
		__dirname + "/../text_files/streamers_to_shoutout.txt",
		"utf8"
	)
	.replace(/\r/g, "")
	.split("\n");

// TTS for streamer to hear redeems, in case they don't have the dashboard open
const textToSpeech = (text: string) => {
	say.speak(text);
};

const randomAutoResponse = ["compliment", "quote", "timer"] as const;

interface Commands {
	[key: string]: string;
}

let commands: Commands = {};
let broadcasterCommands: Commands = {};

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

const streamers: { [key: string]: boolean } = {};

for (const s of streamers_to_shoutout) {
	streamers[s.toLowerCase()] = true;
}

const sendWebHook = async (url: string, data: any) => {
	const form = new FormData();

	form.append("payload_json", JSON.stringify(data));

	await axios.post(url, form);
};

function getUsernameId(username: string): Promise<string> {
	return axios
		.get(`https://api.twitch.tv/helix/users?login=${username}`, {
			headers: {
				"Client-ID": CLIENT_ID,
				Authorization: `Bearer ${CLIENT_TOKEN}`,
			},
		})
		.then((res) => {
			return res.data.data[0].id;
		})
		.catch((err) => {
			console.error(`Error getting user ID for ${username}: ${err}`);
			return "";
		});
}

function getLastGame(id: string): Promise<string> {
	return new Promise((resolve, reject) => {
		axios
			.get(`https://api.twitch.tv/helix/channels?broadcaster_id=${id}`, {
				headers: {
					"Client-ID": CLIENT_ID,
					Authorization: `Bearer ${CLIENT_TOKEN}`,
				},
			})
			.then((res) => {
				resolve(res.data.data[0].game_name);
			})
			.catch((err) => {
				reject(err);
			});
	});
}

function getClip(): Promise<string> {
	return new Promise((resolve, reject) => {
		axios
			.get(CLIP_URL)
			.then((res) => {
				resolve(res.data);
			})
			.catch((err) => {
				reject(err);
			});
	});
}

async function callShoutoutStreamer(username: string) {
	let userID = await getUsernameId(username);
	let game = await getLastGame(userID);

	ComfyJS.Say(
		`Hey guys! Please check out @${username}! They were last streaming ${game} at https://twitch.tv/${username}!`,
		STREAMER
	);
}

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

// Handle chat commands
ComfyJS.onCommand = async (
	user: string,
	command: string,
	message: string,
	flags: any,
	extra: any
) => {
	// Check if the command exists in the regular commands object
	if (commands[command]) {
		let reply = commands[command];
		const user2 = message.split(" ")[0];
		reply = reply.replace("{user}", `@${user}`);
		reply = reply.replace("{user2}", `${user2}`);

		ComfyJS.Say(reply, STREAMER);
	}
	// Check if the command exists in the broadcaster commands object and the user is a broadcaster or mod
	else if (broadcasterCommands[command] && (flags.broadcaster || flags.mod)) {
		let reply = broadcasterCommands[command];
		const user2 = message.split(" ")[0];
		reply = reply.replace("{user}", `@${user}`);
		reply = reply.replace("{user2}", `${user2}`);

		// Send the reply to the chat

		ComfyJS.Say(reply, STREAMER);
	}
	// Handle the "time" command
	else if (command === "time") {
		let d = new Date();
		let localtime = d.toLocaleTimeString("en-US", { hour12: true });

		// Send the current time to the chat

		ComfyJS.Say(`${user} it is currently ${localtime}`, STREAMER);
	}
	// Handle the "promote" command if the user is a broadcaster
	else if (command === "promote" && flags.broadcaster) {
		let content_of_promotion = `<@&1038436118816903210> \n# <https://www.twitch.tv/RyanPython>\n${message}`;

		// Send a webhook to promote the channel
		sendWebHook(WEBHOOK_URL, {
			content: content_of_promotion,
		});

		// Send a confirmation message to the chat

		ComfyJS.Say(`${user} promotion successful!`, STREAMER);
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

		// Send a random compliment to the chat

		ComfyJS.Say(`${compliment_user} ${random_compliment}`, STREAMER);
	}
	// Handle the "quote" command
	else if (command === "quote") {
		let random_quote = quotes[Math.floor(Math.random() * quotes.length)];

		// Send a random quote to the chat

		ComfyJS.Say(`${random_quote}`, STREAMER);
	}
	// Handle the "so" command if the user is a broadcaster or mod
	else if (command === "so" && (flags.broadcaster || flags.mod)) {
		let streamer = message.split(" ")[0];
		streamer = streamer.replace("@", "");

		// Call the shoutout function for the specified streamer
		callShoutoutStreamer(streamer);
	}
	// Handle the "addcommand" command if the user is a broadcaster
	else if (
		["command", "cmd"].includes(command) &&
		message.split(" ")[0] === "add" &&
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

			ComfyJS.Say(
				`${user} command '${command_to_add}' already exists! Please use the edit command instead.`,
				STREAMER
			);
			return;
		}

		// Add the command to the commands object
		addCommand(command_to_add, reply);

		// Send a confirmation message to the chat

		ComfyJS.Say(
			`${user} command '${command_to_add}' added successfully!`,
			STREAMER
		);
	}
	// Handle the "editcommand" command if the user is a broadcaster
	else if (
		["command", "cmd"].includes(command) &&
		message.split(" ")[0] === "edit" &&
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

			ComfyJS.Say(
				`${user} command '${command_to_edit}' doesn't exist! Please use the add command instead.`,
				STREAMER
			);
			return;
		}

		// Edit the command in the commands object
		editCommand(command_to_edit, reply);

		// Send a confirmation message to the chat

		ComfyJS.Say(
			`${user} command '${command_to_edit}' edited successfully!`,
			STREAMER
		);
	}
	// Handle the "deletecommand" command if the user is a broadcaster
	else if (
		["command", "cmd"].includes(command) &&
		["remove", "delete", "del"].includes(message.split(" ")[0]) &&
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

			ComfyJS.Say(
				`${user} command '${command_to_delete}' doesn't exist!`,
				STREAMER
			);
			return;
		}

		// Delete the command from the commands object
		deleteCommand(command_to_delete);

		// Send a confirmation message to the chat

		ComfyJS.Say(
			`${user} command '${command_to_delete}' deleted successfully!`,
			STREAMER
		);
	}
	// Handle the "addbroadcastercommand" command if the user is a broadcaster
	else if (
		["broadcastercommand", "bcmd", "mcmd", "modcommand"].includes(
			command
		) &&
		message.split(" ")[0] === "add" &&
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

		ComfyJS.Say(
			`${user} broadcaster command '${command_to_add}' added successfully!`,
			STREAMER
		);
	}
	// Handle the "editbroadcastercommand" command if the user is a broadcaster
	else if (
		["broadcastercommand", "bcmd", "mcmd", "modcommand"].includes(
			command
		) &&
		message.split(" ")[0] === "edit" &&
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

		ComfyJS.Say(
			`${user} broadcaster command '${command_to_edit}' edited successfully!`,
			STREAMER
		);
	}
	// Handle the "deletebroadcastercommand" command if the user is a broadcaster
	else if (
		["broadcastercommand", "bcmd", "mcmd", "modcommand"].includes(
			command
		) &&
		["remove", "delete", "del"].includes(message.split(" ")[0]) &&
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

		ComfyJS.Say(
			`${user} broadcaster command '${command_to_delete}' deleted successfully!`,
			STREAMER
		);
	}
	// clip command
	else if (command === "clip" && flags.broadcaster) {
		let clip = await getClip();

		ComfyJS.Say(`@${user} ${clip}`, STREAMER);
	}
};

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

		ComfyJS.Say(`@${user} ${randomCompliment}`, STREAMER);
	} else if (autoresponder === "quote") {
		let randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

		// Send a random quote to the chat

		ComfyJS.Say(`${randomQuote}`, STREAMER);
	} else if (autoresponder === "timer") {
		let randomTimerMessage =
			timerMessages[Math.floor(Math.random() * timerMessages.length)];

		// Send a random timer message to the chat

		ComfyJS.Say(`${randomTimerMessage}`, STREAMER);
	}
}

let messageCount: number = 0;
let lastMessageTimestamp: number = Date.now();
let timeLimit = 5 * 60 * 1000; // 5 minutes
let messageLimit = 20;

ComfyJS.onChat = async (
	user: string,
	message: string,
	flags: any,
	self: boolean,
	extra: any
) => {
	// shoutout streamers
	if (streamers[user.toLowerCase()]) {
		setTimeout(() => {
			callShoutoutStreamer(user);
		}, 3000);
		streamers[user.toLowerCase()] = false;
	}

	// After:
	// 20 messages and 5 minutes
	if (
		!["ryandotts", "streamelements", "ryanpython"].includes(
			user.toLowerCase()
		) &&
		messageCount >= messageLimit &&
		Date.now() - lastMessageTimestamp >= timeLimit
	) {
		activateTimerMessages(user);
		messageCount = 0;
		lastMessageTimestamp = Date.now();
	} else {
		messageCount++;
	}
};

ComfyJS.onReward = (
	user: string,
	reward: string,
	cost: string,
	message: string,
	extra: any
) => {
	// console.log(user + " redeemed " + reward + " for " + cost);
	textToSpeech(`${user} redeemed ${reward}`);
};

ComfyJS.Init(BOT_NAME, `oauth:${CLIENT_TOKEN}`, STREAMER);
