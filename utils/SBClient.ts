import { StreamerbotClient } from "@streamerbot/client";

export const client = new StreamerbotClient({
	host: "127.0.0.1",
	port: 6968,
	endpoint: "/",
	subscribe: {
		YouTube: ["Message"],
		Twitch: ["ChatMessage", "RewardRedemption"],
	},
});
