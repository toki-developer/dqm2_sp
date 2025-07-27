export function hiraToKana(str: string): string {
	return str.replace(/[\u3041-\u3096]/g, (ch) =>
		String.fromCharCode(ch.charCodeAt(0) + 0x60),
	);
}
