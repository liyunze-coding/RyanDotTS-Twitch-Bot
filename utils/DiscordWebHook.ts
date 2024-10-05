import axios from "axios";
import FormData from "form-data";

type webhookData = {
	title?: string | null;
	description?: string | null;
	message?: string | null;
	author?: string | null;
	author_url?: string | null;
};

export async function sendMessageWebHook(url: string, message: any) {
	let data = JSON.stringify({
		content: message,
	});

	var config = {
		method: "POST",
		url: url,
		headers: { "Content-Type": "application/json" },
		data: data,
	};

	axios(config)
		.then((response) => {
			return response;
		})
		.catch((error) => {
			console.log(error);
			return error;
		});
}

export async function sendEmbedWebHook(url: string, webhookData: webhookData) {
	let embeds = [
		{
			title: webhookData.title,
			description: webhookData.description,
			color: 0x2f3135,
		},
	];

	let data = JSON.stringify({
		content: webhookData.message,
		embeds,
		username: webhookData.author,
		avatar_url: webhookData.author_url,
	});

	var config = {
		method: "POST",
		url: url,
		headers: { "Content-Type": "application/json" },
		data: data,
	};

	//Send the request
	axios(config)
		.then((response) => {
			return response;
		})
		.catch((error) => {
			console.log(error);
			return error;
		});
}

// await sendEmbedWebHook(
// 	"https://discord.com/api/webhooks/1065413606080004217/S6M4YsBJZugNERrkZ8OWpuGj-Oee1NTHNUiPgjoltKUpWp-heaigMd5Ix5mI1671CdAE"
// );
