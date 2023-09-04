import { Notice, App, TFile, WorkspaceLeaf } from "obsidian";

export class KanbanStamp {
	private app: App;
	private static readonly WORK_FILE_PATH = "Work/Work.md";

	// Constants
	private FRONT_MATTER_DELIMITER = "---";
	private KANBAN_PLUGIN_TAG = "kanban-plugin: basic";
	private BACKLOG_TITLE = "kanban-plugin: basic";

	constructor(app: App) {
		this.app = app;
	}

	public stamp() {
		interface Item {
			text: string;
			startDateTime?: string;
			endDateTime?: string;
			isChecked: boolean;
		}

		interface Heading {
			items: Item[];
			index: number;
			tag: string;
		}

		interface Kanban {
			headings: Record<string, Heading>;
			completeLoc: string;
		}

		const activeLeaf: WorkspaceLeaf | null = app.workspace.activeLeaf;

		if (!activeLeaf || !activeLeaf.view) {
			new Notice(
				"Couldn't access the editor. Make sure an editor pane is active."
			);
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const file: TFile = (activeLeaf.view as any).file;
		let lastModifiedContent = ""; // This will store the last modified content

		app.vault.read(file).then((content: string) => {
			const lines = content.split("\n");
			if (
				content !== lastModifiedContent &&
				lines[2] === this.KANBAN_PLUGIN_TAG
			) {
				getKanban(lines);
				// const ban = getKanban(lines);
				// let currentTag = "";
				// Object.keys(ban).forEach(function (key) {
				// 	const value = ban[key];
				// 	currentTag = getTag(key);
				// 	console.log(value);
				// 	value.e.forEach((element, index) => {
				// 		//Add tags
				// 		element = removeTags(element);
				// 		element = `${element} ${currentTag}`;
				// 		value.e[index] = element;
				// 		console.log(element);
				// 	});
				// 	// if()
				// });
				// //let currentTag = null;
				// console.log(ban);
			}

			const updatedContent = lines.join("\n");
			if (updatedContent !== content) {
				app.vault.modify(file, updatedContent);
				lastModifiedContent = updatedContent;
				new Notice("Tags have been propagated!");
			}
		});

		function getKanban(lines: string[]) {
			const kanban: Kanban = { headings: {}, completeLoc: "" };
			let currentHeader = "";
			let currentTag = "";
			let headingIndex = 0;

			for (let i = 5; i < lines.length; i++) {
				const line = lines[i];
				if (line.startsWith("##")) {
					const header = line.match(/^##\s*(.+)/);
					currentTag = getTag(line);
					currentHeader = header ? header[1] : "";

					kanban.headings[currentHeader] = {
						items: [],
						index: headingIndex,
						tag: currentTag,
					};
					headingIndex++;
					continue;
				}

				apendItem(line, kanban, currentTag, currentHeader);

				if (line.startsWith("**Complete**")) {
					kanban.completeLoc = currentHeader;
				}
			}
			console.log(kanban);
			return kanban;
		}

		function apendItem(
			line: string,
			kanban: Kanban,
			currentTag: string,
			currentHeader: string
		) {
			if (isListItemOrTask(line)) {
				const startDatetimeMatch = line.match(
					/(🛫 \d{2}-\d{2}-\d{4} \d{1,2}:\d{2}[ap]m)/
				);
				const endDatetimeMatch = line.match(
					/(✅ \d{2}-\d{2}-\d{4} \d{1,2}:\d{2}[ap]m)/
				);
				const textMathc = line.match(
					/- \[[x ]\]\s*(.*?)\s*(?=(🛫 \d{2}-\d{2}-\d{4} \d{1,2}:\d{2}[ap]m|✅ \d{2}-\d{2}-\d{4} \d{1,2}:\d{2}[ap]m #\w+|$))/
				);
				const newLine: Item = {
					text: textMathc ? textMathc[1] : "",
					startDateTime: startDatetimeMatch
						? startDatetimeMatch[1]
						: "",
					endDateTime: endDatetimeMatch ? endDatetimeMatch[1] : "",
					isChecked: isChecked(line),
				};
				if (currentTag === "#w" && !newLine.startDateTime) {
					newLine.startDateTime = getCurrentDatetime();
				}
				kanban.headings[currentHeader].items.push(newLine);
			}
		}

		// function removeTags(line: string) {
		// 	return line.replace(/#[^\s#]+/g, "").trim();
		// }

		function isListItemOrTask(line: string) {
			return line.startsWith("- [ ]") || line.startsWith("- [x]");
		}
		/**
		 * Test
		 * @returns True if checked
		 */
		function isChecked(line: string) {
			return line.startsWith("- [x]");
		}

		const getCurrentDatetime = () => {
			const currentDate = new Date();
			const day = String(currentDate.getDate()).padStart(2, "0");
			const month = String(currentDate.getMonth() + 1).padStart(2, "0");
			const year = currentDate.getFullYear();
			let hours = currentDate.getHours();
			const ampm = hours >= 12 ? "pm" : "am";
			hours = hours % 12;
			hours = hours || 12;
			const minutes = String(currentDate.getMinutes()).padStart(2, "0");
			return `${day}-${month}-${year} ${hours}:${minutes}${ampm}`;
		};

		function getTag(line: string) {
			const tagMatches = line.match(/#[^\s#]+/g);
			if (tagMatches) {
				return tagMatches[tagMatches.length - 1];
			}

			return "";
		}
	}
}
