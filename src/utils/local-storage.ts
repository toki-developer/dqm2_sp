export async function asyncLocalStorageSetItem(key: string, value: any) {
	if (typeof window !== "undefined") {
		window.localStorage.setItem(key, JSON.stringify(value));
		console.log("log1");
	}
}
