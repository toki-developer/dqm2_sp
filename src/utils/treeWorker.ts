// src/utils/treeWorker.ts
// WebWorker for heavy tree calculation (めぐり合い活用対応)

// 型定義（DisplayTreeNode）
type DisplayTreeNode = {
	name: string;
	children: DisplayTreeNode[];
	path: string;
};

declare function postMessage(message: any): void;

// ツリー構築関数（isMeguriaiEnabled対応）
function buildDisplayTree(
	name: string,
	path: string,
	checkedMap: Record<string, boolean>,
	wildMap: Record<string, boolean>,
	result: Record<string, { childrenList: string[][] }>,
	visited: Set<string> = new Set(),
	meguriaiSet: Set<string> = new Set(),
	isMeguriaiEnabled: boolean = true,
): DisplayTreeNode {
	if (checkedMap[path] || wildMap[name]) {
		return { name, children: [], path };
	}
	if (visited.has(name)) {
		return { name, children: [], path };
	}
	if (isMeguriaiEnabled && meguriaiSet.has(name)) {
		return { name, children: [], path };
	}
	if (isMeguriaiEnabled) meguriaiSet.add(name);
	const node = result[name];
	if (!node || !node.childrenList || node.childrenList.length === 0) {
		return { name, children: [], path };
	}
	const pattern = node.childrenList[0];
	if (!pattern) return { name, children: [], path };
	const nextVisited = new Set(visited);
	nextVisited.add(name);
	const children = pattern.map((child, idx) => {
		const childPath = path ? `${path}/${child}:${idx}` : `${child}:${idx}`;
		return buildDisplayTree(
			child,
			childPath,
			checkedMap,
			wildMap,
			result,
			nextVisited,
			meguriaiSet,
			isMeguriaiEnabled,
		);
	});
	return { name, children, path };
}

// WebWorkerメイン
self.onmessage = (e) => {
	const { selected, checkedMap, wildMap, isMeguriaiEnabled, result } = e.data;
	const tree = buildDisplayTree(
		selected,
		"",
		checkedMap,
		wildMap,
		result,
		new Set(),
		new Set(),
		isMeguriaiEnabled,
	);
	postMessage(tree);
};
