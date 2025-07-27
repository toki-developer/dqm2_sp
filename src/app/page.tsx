"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { asyncLocalStorageSetItem } from "@/utils/local-storage";
import { hiraToKana } from "@/utils/string";
import resultData from "../../resource/breeding.json";

type ResultType = Record<string, { childrenList: string[][] }>;
const result = resultData as ResultType;

// ひらがな→カタカナ変換
function getCandidates(input: string): string[] {
  if (!input) return [];
  // 入力・候補名ともカタカナに正規化
  const inputKana = hiraToKana(input).toLowerCase();
  return Object.keys(result).filter((name) =>
    hiraToKana(name).toLowerCase().includes(inputKana)
  );
}

// 表示用ツリー構造の型
export type DisplayTreeNode = {
  name: string;
  children: DisplayTreeNode[];
  path: string;
};

type TreeProps = {
  node: DisplayTreeNode;
  checkedMap?: Record<string, boolean>;
  setCheckedMap?: (map: Record<string, boolean>) => void;
  wildMap?: Record<string, boolean>;
  setWildMap?: (map: Record<string, boolean>) => void;
  genderMap?: Record<string, number>;
  setGenderMap?: (map: Record<string, number>) => void;
};

function Tree({
  node,
  checkedMap = {},
  setCheckedMap = () => {},
  wildMap = {},
  setWildMap = () => {},
  genderMap = {},
  setGenderMap = () => {},
}: TreeProps) {
  const { name, children, path } = node;
  return (
    <ul className="whitespace-nowrap">
      <li key={path} style={{ position: "relative" }}>
        <label
          className="inline-flex items-center ml-0 cursor-pointer select-none relative"
          style={{ position: "relative" }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const newMap = {
                ...checkedMap,
                [path]: !checkedMap[path],
              };
              setCheckedMap(newMap);
              asyncLocalStorageSetItem("dqm2_tree_checked", newMap);
            }}
            className="cursor-pointer mr-2 bg-transparent border-none p-0 text-inherit align-baseline"
          >
            {name}
          </button>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={!!checkedMap[path]}
              onChange={() => {
                const newMap = {
                  ...checkedMap,
                  [path]: !checkedMap[path],
                };
                setCheckedMap(newMap);
                asyncLocalStorageSetItem("dqm2_tree_checked", newMap);
              }}
              className="peer w-5 h-5 border-2 border-blue-400 rounded-full checked:bg-blue-500 checked:border-transparent focus:outline-none transition-colors duration-150 align-middle appearance-none flex-shrink-0"
              style={{ position: "relative", zIndex: 1, background: "none" }}
            />
            <svg
              className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-white peer-checked:block hidden"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ zIndex: 2 }}
            >
              <title>チェック済み</title>
              <polyline points="5 10.5 9 15 15 6" />
            </svg>
          </div>
          {!checkedMap[path] && (
            <WildToggleButton
              name={name}
              wildMap={wildMap}
              setWildMap={setWildMap}
            />
          )}
          {checkedMap[path] && (
            <GenderToggleButton
              path={path}
              genderMap={genderMap}
              setGenderMap={setGenderMap}
            />
          )}
        </label>
        {/* 子ノード描画 */}
        {children.length > 0 && !checkedMap[path] && !wildMap[name] && (
          <ul style={{ marginLeft: 16 }} className="whitespace-nowrap">
            {children.map((childNode) => (
              <Tree
                key={childNode.path}
                node={childNode}
                checkedMap={checkedMap}
                setCheckedMap={setCheckedMap}
                wildMap={wildMap}
                setWildMap={setWildMap}
                genderMap={genderMap}
                setGenderMap={setGenderMap}
              />
            ))}
          </ul>
        )}
      </li>
    </ul>
  );
}

// 性別切替ボタン
function GenderToggleButton({
  path,
  genderMap = {},
  setGenderMap = () => {},
}: {
  path: string;
  genderMap?: Record<string, number>;
  setGenderMap?: (map: Record<string, number>) => void;
}) {
  const genderList = [
    { icon: "?", color: "text-gray-400 opacity-60" },
    { icon: "♂", color: "text-blue-500" },
    { icon: "♀", color: "text-pink-500" },
    { icon: "⚥", color: "text-green-500" },
  ];
  const gender = genderMap[path] ?? 0;
  const nextGender = () => {
    const newGender = (gender + 1) % 4;
    const newMap = { ...genderMap, [path]: newGender };
    setGenderMap(newMap);
    asyncLocalStorageSetItem("dqm2_tree_gender", newMap);
  };
  return (
    <button
      type="button"
      onClick={nextGender}
      className={`w-6 h-6 flex items-center justify-center text-lg font-bold border-none outline-none bg-transparent transition-colors duration-150 ${genderList[gender].color}`}
      aria-label="性別切替"
      style={{ minWidth: 24, minHeight: 24 }}
    >
      {genderList[gender].icon}
    </button>
  );
}

// 野生入手切替ボタン
function WildToggleButton({
  name,
  wildMap = {},
  setWildMap = () => {},
}: {
  name: string;
  wildMap?: Record<string, boolean>;
  setWildMap?: (map: Record<string, boolean>) => void;
}) {
  const wild = !!wildMap[name];
  const toggleWild = () => {
    const newMap = { ...wildMap, [name]: !wild };
    setWildMap(newMap);
    asyncLocalStorageSetItem("dqm2_tree_wild", newMap);
  };
  return (
    <button
      type="button"
      onClick={toggleWild}
      className={`ml-2 w-6 h-6 flex items-center justify-center text-lg border-none outline-none bg-transparent transition-opacity duration-150 ${
        wild ? "opacity-100" : "opacity-30"
      }`}
      aria-label="野生入手切替"
      style={{ minWidth: 24, minHeight: 24 }}
    >
      <span role="img" aria-label="野生入手可">
        🌱
      </span>
    </button>
  );
}

// DisplayTreeNodeから必要なモンスター一覧を集計する関数
function collectLeafMonstersFromDisplayTree(
  node: DisplayTreeNode,
  checkedMap: Record<string, boolean>,
  wildMap: Record<string, boolean>
): string[] {
  // チェック済みや野生入手ならそのノードのみ
  if (checkedMap[node.path] || wildMap[node.name]) return [node.name];
  // 末端ノード
  if (node.children.length === 0) return [node.name];
  let leaves: string[] = [];
  node.children.forEach((child) => {
    leaves = leaves.concat(
      collectLeafMonstersFromDisplayTree(child, checkedMap, wildMap)
    );
  });
  return leaves;
}

// 必要なモンスター一覧コンポーネント（DisplayTreeNode版）
function RequiredMonstersList({
  displayTree,
  checkedMap,
  wildMap,
}: {
  displayTree: DisplayTreeNode | null;
  checkedMap: Record<string, boolean>;
  wildMap: Record<string, boolean>;
}) {
  if (!displayTree) return null;
  const leaves = collectLeafMonstersFromDisplayTree(
    displayTree,
    checkedMap,
    wildMap
  );
  // モンスターごとに個数をカウント
  const countMap: Record<string, number> = {};
  leaves.forEach((name) => {
    countMap[name] = (countMap[name] || 0) + 1;
  });
  const uniqueLeaves = Object.keys(countMap);
  return (
    <div className="mt-6">
      <span className="block text-sm text-gray-300 mb-1">
        必要なモンスター一覧
      </span>
      <div className="rounded-lg px-4 py-2 bg-blue-500/20 text-white text-base font-semibold flex flex-wrap items-center gap-x-2 gap-y-1">
        {uniqueLeaves.map((name, idx) => (
          <span key={name} className="flex items-center">
            {name}
            {countMap[name] > 1 && `×${countMap[name]}`}
            {idx < uniqueLeaves.length - 1 && (
              <span className="mx-2 text-blue-100">|</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// 作成途中モンスター一覧コンポーネント
function InProgressMonstersList({
  checkedMap,
  selected,
  setSelected,
}: {
  checkedMap: Record<string, Record<string, boolean>>;
  selected: string;
  setSelected: React.Dispatch<React.SetStateAction<string>>;
}) {
  if (Object.keys(checkedMap).length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-4 text-gray-500 mt-4">
      <span className="w-full text-sm mb-1">作成途中モンスター</span>
      {Object.keys(checkedMap).map((root) => (
        <button
          key={root}
          type="button"
          className={`px-3 py-1 rounded border bg-white/10 font-semibold shadow-sm hover:bg-white/20 transition-colors duration-100 ${
            selected === root ? "text-blue-400 border-blue-500" : ""
          }`}
          onClick={() => setSelected(root)}
          aria-current={selected === root ? "true" : undefined}
        >
          {root}
        </button>
      ))}
    </div>
  );
}

// 経過削除ボタンコンポーネント
function DeleteProgressButton({
  selected,
  setCheckedMap,
  setGenderMap,
  setSelected,
}: {
  selected: string;
  setCheckedMap: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, boolean>>>
  >;
  setGenderMap: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, number>>>
  >;
  setSelected: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <button
      type="button"
      className="mt-8 px-2 py-1 text-red-500 text-sm font-normal bg-transparent border-none shadow-none hover:underline focus:underline outline-none"
      onClick={() => {
        setCheckedMap((prev) => {
          const { [selected]: _, ...rest } = prev;
          asyncLocalStorageSetItem("dqm2_tree_checked", rest);
          return rest;
        });
        setGenderMap((prev) => {
          const { [selected]: _, ...rest } = prev;
          asyncLocalStorageSetItem("dqm2_tree_gender", rest);
          return rest;
        });
        setSelected("");
      }}
    >
      この作成途中モンスターの経過を削除
    </button>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const candidates = useMemo(() => getCandidates(input), [input]);
  const [checkedMap, setCheckedMap] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [wildMap, setWildMap] = useState<Record<string, boolean>>({});
  const [genderMap, setGenderMap] = useState<
    Record<string, Record<string, number>>
  >({});
  const [isMeguriaiEnabled] = useState(true); // めぐり合い活用機能ON固定
  const globalVisitedRef = useRef<Set<string>>(new Set());
  const [displayTree, setDisplayTree] = useState<DisplayTreeNode | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // selectedが変わったとき、なければ空objectをセット
  useEffect(() => {
    if (selected) {
      setCheckedMap((prev) => ({ ...prev, [selected]: prev[selected] || {} }));
      setGenderMap((prev) => ({ ...prev, [selected]: prev[selected] || {} }));
    }
  }, [selected]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("dqm2_tree_checked");
      if (saved) setCheckedMap(JSON.parse(saved));
      const wildSaved = window.localStorage.getItem("dqm2_tree_wild");
      if (wildSaved) setWildMap(JSON.parse(wildSaved));
      const genderSaved = window.localStorage.getItem("dqm2_tree_gender");
      if (genderSaved) setGenderMap(JSON.parse(genderSaved));
    }
  }, []);

  // selectedごとのmap/setter
  const checkedMapForSelected = checkedMap[selected] || {};
  const setCheckedMapForSelected = (map: Record<string, boolean>) => {
    setCheckedMap((prev) => {
      const newCheckedMap = { ...prev, [selected]: map };
      asyncLocalStorageSetItem("dqm2_tree_checked", newCheckedMap);
      return newCheckedMap;
    });
  };
  const genderMapForSelected = genderMap[selected] || {};
  const setGenderMapForSelected = (map: Record<string, number>) => {
    setGenderMap((prev) => {
      const newGenderMap = { ...prev, [selected]: map };
      asyncLocalStorageSetItem("dqm2_tree_gender", newGenderMap);
      return newGenderMap;
    });
  };

  // グローバル訪問済みSetを初期化（JSX外で副作用実行）
  if (selected) {
    globalVisitedRef.current.clear();
    globalVisitedRef.current.add(selected);
  }

  // WebWorkerでdisplayTreeを構築
  useEffect(() => {
    if (!selected) {
      setDisplayTree(null);
      setIsLoading(false);
      return;
    }
    let loadingTimer: NodeJS.Timeout | null = null;
    let isUnmounted = false;
    // 0.1秒後にまだloadingならisLoadingをtrueにする
    loadingTimer = setTimeout(() => {
      if (!isUnmounted) setIsLoading(true);
    }, 100);
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../utils/treeWorker.ts", import.meta.url),
        { type: "module" }
      );
    }
    const worker = workerRef.current;
    worker.onmessage = (e) => {
      setDisplayTree(e.data);
      setIsLoading(false);
      if (loadingTimer) clearTimeout(loadingTimer);
    };
    worker.postMessage({
      selected,
      checkedMap: checkedMapForSelected,
      wildMap,
      isMeguriaiEnabled,
      result,
    });
    return () => {
      isUnmounted = true;
      if (loadingTimer) clearTimeout(loadingTimer);
      worker.onmessage = null;
    };
  }, [selected, checkedMapForSelected, wildMap, isMeguriaiEnabled]);

  return (
    <div className="mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">配合ツリー検索</h1>
      <input
        type="search"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setSelected("");
        }}
        placeholder="モンスター名を入力"
        className="w-full text-lg p-2 mb-2 bg-transparent border-2 border-blue-400 rounded-lg outline-none shadow-sm focus:border-blue-600 placeholder-gray-400"
        aria-label="モンスター名を入力"
        autoComplete="off"
      />
      {input && candidates.length > 0 && !selected && (
        <ul className="bg-transparent border-2 border-blue-400 p-2 rounded-lg mb-2 shadow-sm">
          {candidates.slice(0, 10).map((name) => (
            <li key={name}>
              <button
                type="button"
                className="block w-full text-left cursor-pointer p-2 hover:bg-blue-100 rounded bg-transparent text-lg border-none outline-none"
                onClick={() => setSelected(name)}
                onKeyUp={(e) => {
                  if (e.key === "Enter") setSelected(name);
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* 作成途中モンスター一覧 横並び・グレー文字・候補リストの下 */}
      <InProgressMonstersList
        checkedMap={checkedMap}
        selected={selected}
        setSelected={setSelected}
      />
      {selected && (
        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mr-3"></span>
              <span className="text-blue-400 text-lg font-semibold">
                計算中...
              </span>
            </div>
          ) : (
            displayTree && (
              <>
                <h2 className="text-xl font-semibold mb-2">
                  {selected} の配合ツリー
                </h2>
                <Tree
                  node={displayTree}
                  checkedMap={checkedMapForSelected}
                  setCheckedMap={setCheckedMapForSelected}
                  wildMap={wildMap}
                  setWildMap={setWildMap}
                  genderMap={genderMapForSelected}
                  setGenderMap={setGenderMapForSelected}
                />
                <RequiredMonstersList
                  displayTree={displayTree}
                  checkedMap={checkedMapForSelected}
                  wildMap={wildMap}
                />
                <DeleteProgressButton
                  selected={selected}
                  setCheckedMap={setCheckedMap}
                  setGenderMap={setGenderMap}
                  setSelected={setSelected}
                />
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
