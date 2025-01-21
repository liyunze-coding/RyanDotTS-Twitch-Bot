export function roundTo(n: number, digits: number) {
	if (digits === undefined) {
		digits = 0;
	}

	var multiplicator = Math.pow(10, digits);
	n = parseFloat((n * multiplicator).toFixed(11));
	var test = Math.round(n) / multiplicator;
	return +test.toFixed(digits);
}

// Conversion functions
export function convertLength(
	value: number,
	fromUnit: string,
	toUnit: string
): string | number {
	if (fromUnit === "cm" && toUnit === "ft+in") {
		const totalInches = value / 2.54;
		const feet = Math.floor(totalInches / 12);
		const inches = roundTo(totalInches % 12, 2);
		return `${feet}ft ${inches}in`;
	} else if (fromUnit === "ft+in" && toUnit === "cm") {
		const [feet, inches] = value.toString().split(" ").map(parseFloat);
		const totalInches = feet * 12 + inches;
		return roundTo(totalInches * 2.54, 2);
	} else {
		throw new Error(`Unsupported length unit: ${fromUnit} or ${toUnit}`);
	}
}

export function isNumeric(str: string) {
	return !isNaN(Number(str));
}

export function convertSpeed(
	value: number,
	fromUnit: string,
	toUnit: string
): string {
	const conversions: { [key: string]: number } = {
		mph: 0.44704,
		kph: 1 / 3.6,
		kmph: 1 / 3.6,
		"m/s": 1,
	};

	if (!(fromUnit in conversions) || !(toUnit in conversions)) {
		throw new Error(`Unsupported speed unit: ${fromUnit} or ${toUnit}`);
	}

	return roundTo(
		(value * conversions[fromUnit]) / conversions[toUnit],
		2
	).toString();
}

export function convertVolume(
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

export function convertTemperature(
	value: number,
	fromUnit: string,
	toUnit: string
): number {
	fromUnit = fromUnit.toUpperCase();
	toUnit = toUnit.toUpperCase();
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
