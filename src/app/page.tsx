"use client";
import { useEffect, useMemo, useState } from "react";
import resultData from "../../resource/breeding.json";

type ResultType = Record<string, { childrenList: string[] }>;
const result = resultData as ResultType;

// ひらがな→カタカナ変換
function hiraToKana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function getCandidates(input: string): string[] {
  if (!input) return [];
  // 入力・候補名ともカタカナに正規化
  const inputKana = hiraToKana(input).toLowerCase();
  return Object.keys(result).filter((name) =>
    hiraToKana(name).toLowerCase().includes(inputKana)
  );
}

type TreeProps = {
  data: { childrenList: string[] };
  depth?: number;
  path: string; // 追加: 現在のパス
  checkedMap?: Record<string, boolean>;
  setCheckedMap?: (map: Record<string, boolean>) => void;
  wildMap?: Record<string, boolean>;
  setWildMap?: (map: Record<string, boolean>) => void;
  genderMap?: Record<string, number>;
  setGenderMap?: (map: Record<string, number>) => void;
};

function Tree({
  data,
  depth = 0,
  path,
  checkedMap = {},
  setCheckedMap = () => {},
  wildMap = {},
  setWildMap = () => {},
  genderMap = {},
  setGenderMap = () => {},
}: TreeProps) {
  if (!data || !data.childrenList || data.childrenList.length === 0)
    return null;
  return (
    <ul style={{ marginLeft: depth * 4 }}>
      {data.childrenList.map((child, idx) => {
        const childPath = path ? `${path}/${child}:${idx}` : `${child}:${idx}`;
        // wildMapはchild名で参照
        return (
          <li key={childPath} style={{ position: "relative" }}>
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
                    [childPath]: !checkedMap[childPath],
                  };
                  setCheckedMap(newMap);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem(
                      "dqm2_tree_checked",
                      JSON.stringify(newMap)
                    );
                  }
                }}
                className="cursor-pointer mr-2 bg-transparent border-none p-0 text-inherit align-baseline"
              >
                {child}
              </button>
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={!!checkedMap[childPath]}
                  onChange={() => {
                    const newMap = {
                      ...checkedMap,
                      [childPath]: !checkedMap[childPath],
                    };
                    setCheckedMap(newMap);
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem(
                        "dqm2_tree_checked",
                        JSON.stringify(newMap)
                      );
                    }
                  }}
                  className="peer w-5 h-5 border-2 border-blue-400 rounded-full checked:bg-blue-500 checked:border-transparent focus:outline-none transition-colors duration-150 align-middle appearance-none flex-shrink-0"
                  style={{
                    position: "relative",
                    zIndex: 1,
                    background: "none",
                  }}
                />
                {/* チェック時のみチェックマークを表示 */}
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
              {/* 🌱野生入手ボタン: チェックがない時のみ表示。wildMapはchild名で参照 */}
              {!checkedMap[childPath] && (
                <WildToggleButton
                  name={child}
                  wildMap={wildMap}
                  setWildMap={setWildMap}
                />
              )}
              {/* 性別切替ボタン: チェック時のみ表示 */}
              {checkedMap[childPath] && (
                <GenderToggleButton
                  path={childPath}
                  genderMap={genderMap}
                  setGenderMap={setGenderMap}
                />
              )}
            </label>
            {/* 子の表示: チェックが入っていない、かつ野生入手ボタンもONでない場合のみ。wildMapはchild名で参照 */}
            {result[child] && !checkedMap[childPath] && !wildMap[child] && (
              <Tree
                data={result[child]}
                depth={depth + 1}
                path={childPath}
                checkedMap={checkedMap}
                setCheckedMap={setCheckedMap}
                wildMap={wildMap}
                setWildMap={setWildMap}
                genderMap={genderMap}
                setGenderMap={setGenderMap}
              />
            )}
          </li>
        );
      })}
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
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dqm2_tree_gender", JSON.stringify(newMap));
    }
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
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dqm2_tree_wild", JSON.stringify(newMap));
    }
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

// 必要なモンスター一覧を取得する再帰関数
function collectLeafMonsters(
  name: string,
  path: string,
  wildMap: Record<string, boolean>,
  checkedMap: Record<string, boolean>
): string[] {
  // checkedMapで非表示なら末端扱いにしない
  if (checkedMap[path]) return [];
  // 野生マークがついていればそのモンスターのみ
  if (wildMap[name]) return [name];
  const node = result[name];
  if (!node || !node.childrenList || node.childrenList.length === 0) {
    return [name];
  }
  // 子がいれば再帰的に集める
  let leaves: string[] = [];
  node.childrenList.forEach((child, idx) => {
    const childPath = path ? `${path}/${child}:${idx}` : `${child}:${idx}`;
    leaves = leaves.concat(
      collectLeafMonsters(child, childPath, wildMap, checkedMap)
    );
  });
  return leaves;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string>("");
  const candidates = useMemo(() => getCandidates(input), [input]);
  const [checkedMap, setCheckedMap] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [wildMap, setWildMap] = useState<Record<string, boolean>>({});
  const [genderMap, setGenderMap] = useState<
    Record<string, Record<string, number>>
  >({});

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
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "dqm2_tree_checked",
          JSON.stringify(newCheckedMap)
        );
      }
      return newCheckedMap;
    });
  };
  const genderMapForSelected = genderMap[selected] || {};
  const setGenderMapForSelected = (map: Record<string, number>) => {
    setGenderMap((prev) => {
      const newGenderMap = { ...prev, [selected]: map };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "dqm2_tree_gender",
          JSON.stringify(newGenderMap)
        );
      }
      return newGenderMap;
    });
  };

  return (
    <div className="max-w-xl mx-auto p-6">
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
      {Object.keys(checkedMap).length > 0 && (
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
      )}
      {selected && result[selected] && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">
            {selected} の配合ツリー
          </h2>
          <Tree
            data={result[selected]}
            depth={0}
            path={`${selected}:0`}
            checkedMap={checkedMapForSelected}
            setCheckedMap={setCheckedMapForSelected}
            wildMap={wildMap}
            setWildMap={setWildMap}
            genderMap={genderMapForSelected}
            setGenderMap={setGenderMapForSelected}
          />
          {/* 必要なモンスター一覧 */}
          {(() => {
            const leaves = collectLeafMonsters(
              selected,
              `${selected}:0`,
              wildMap,
              checkedMapForSelected
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
          })()}
          {/* 経過削除ボタン（背景・枠線なし、赤文字のみ） */}
          <button
            type="button"
            className="mt-8 px-2 py-1 text-red-500 text-sm font-normal bg-transparent border-none shadow-none hover:underline focus:underline outline-none"
            onClick={() => {
              setCheckedMap((prev) => {
                const { [selected]: _, ...rest } = prev;
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(
                    "dqm2_tree_checked",
                    JSON.stringify(rest)
                  );
                }
                return rest;
              });
              setGenderMap((prev) => {
                const { [selected]: _, ...rest } = prev;
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(
                    "dqm2_tree_gender",
                    JSON.stringify(rest)
                  );
                }
                return rest;
              });
              setSelected("");
            }}
          >
            この作成途中モンスターの経過を削除
          </button>
        </div>
      )}
    </div>
  );
}
