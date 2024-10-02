import { exec } from "child_process";

// Function to escape single quotes for PowerShell
function escapeTextForPowershell(text: string): string {
	return text.replace(/'/g, "''");
}

export default async function textToSpeech(message: string) {
	// Escape any single quotes in the text for PowerShell
	const escapedText = escapeTextForPowershell(message);

	// PowerShell command to invoke the SpeechSynthesizer
	const command = `powershell.exe Add-Type -AssemblyName System.speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${escapedText}')`;

	// Execute PowerShell command
	exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(`Error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.error(`stderr: ${stderr}`);
			return;
		}
		// console.log("Text-to-speech complete.");
	});
}
