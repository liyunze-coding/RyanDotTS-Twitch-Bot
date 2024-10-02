function roundTo(n: number, digits: number) {
	if (digits === undefined) {
		digits = 0;
	}

	var multiplicator = Math.pow(10, digits);
	n = parseFloat((n * multiplicator).toFixed(11));
	var test = Math.round(n) / multiplicator;
	return +test.toFixed(digits);
}

// Conversion functions
function convertLength(
	value: number,
	fromUnit: string,
	toUnit: string
): number {
	const conversions: { [key: string]: number } = {
		ft: 0.3048,
		"'": 0.3048,
		inch: 0.0254,
		'"': 0.0254,
		m: 1,
	};

	if (!(fromUnit in conversions) || !(toUnit in conversions)) {
		throw new Error(`Unsupported length unit: ${fromUnit} or ${toUnit}`);
	}

	return roundTo((value * conversions[fromUnit]) / conversions[toUnit], 2);
}

function convertSpeed(value: number, fromUnit: string, toUnit: string): number {
	const conversions: { [key: string]: number } = {
		mph: 0.44704,
		kph: 1 / 3.6,
		"m/s": 1,
	};

	if (!(fromUnit in conversions) || !(toUnit in conversions)) {
		throw new Error(`Unsupported speed unit: ${fromUnit} or ${toUnit}`);
	}

	return roundTo((value * conversions[fromUnit]) / conversions[toUnit], 2);
}

function convertVolume(
	value: number,
	fromUnit: string,
	toUnit: string
): number {
	const conversions: { [key: string]: number } = {
		gallon: 3.78541,
		gal: 3.78541,
		litre: 1,
		liter: 1,
		l: 1,
	};

	if (!(fromUnit in conversions) || !(toUnit in conversions)) {
		throw new Error(`Unsupported volume unit: ${fromUnit} or ${toUnit}`);
	}

	return roundTo((value * conversions[fromUnit]) / conversions[toUnit], 2);
}

function convertTemperature(
	value: number,
	fromUnit: string,
	toUnit: string
): number {
	if (fromUnit === "F" && toUnit === "C") {
		return roundTo(((value - 32) * 5) / 9, 2); // Fahrenheit to Celsius
	} else if (fromUnit === "C" && toUnit === "F") {
		return roundTo((value * 9) / 5 + 32, 2); // Celsius to Fahrenheit
	} else if (fromUnit === "C" && toUnit === "C") {
		return value; // Celsius to Celsius
	} else if (fromUnit === "F" && toUnit === "F") {
		return value; // Fahrenheit to Fahrenheit
	} else {
		throw new Error(
			`Unsupported temperature unit: ${fromUnit} or ${toUnit}`
		);
	}
}

export function matchPattern(input: string) {
	const lengthPattern = /^(0|[1-9][0-9]*)\s*(ft|\'|inch|\"|m)$/;
	const speedPattern = /^(0|[1-9][0-9]*)\s*(mph|kph|m\/s)$/;
	const volumePattern = /^(0|[1-9][0-9]*)\s*(gallon|gal|litre|liter|l)$/;
	const temperaturePattern = /^(0|[1-9][0-9]*)\s*(F|C)$/;

	input = input.trim();

	let response = {
		category: "",
		unit: "",
		value: 0,
	};
}

// Main conversion function
export function convert(input: string, toUnit: string): string {
	const lengthPattern = /^(0|[1-9][0-9]*)\s*(ft|\'|inch|\"|m)$/;
	const speedPattern = /^(0|[1-9][0-9]*)\s*(mph|kph|m\/s)$/;
	const volumePattern = /^(0|[1-9][0-9]*)\s*(gallon|gal|litre|liter|l)$/;
	const temperaturePattern = /^(0|[1-9][0-9]*)\s*(F|C)$/;

	input = input.trim();
	toUnit = toUnit.trim();

	let match = input.match(lengthPattern);
	if (match) {
		const value = parseFloat(match[1]);
		const fromUnit = match[2];
		return `${convertLength(value, fromUnit, toUnit)} ${toUnit}`;
	}

	match = input.match(speedPattern);
	if (match) {
		const value = parseFloat(match[1]);
		const fromUnit = match[2];
		return `${convertSpeed(value, fromUnit, toUnit)} ${toUnit}`;
	}

	match = input.match(volumePattern);
	if (match) {
		const value = parseFloat(match[1]);
		const fromUnit = match[2];
		return `${convertVolume(value, fromUnit, toUnit)} ${toUnit}`;
	}

	match = input.match(temperaturePattern);
	if (match) {
		const value = parseFloat(match[1]);
		const fromUnit = match[2];

		console.log(value, fromUnit, toUnit);
		return `${convertTemperature(value, fromUnit, toUnit)} ${toUnit}`;
	}

	return `Unsupported input: ${input}`;
}
