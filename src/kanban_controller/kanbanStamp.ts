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

	public async stamp() {
		const backlogTag = "#b";
		const inProgressTag = "#w";
		const compleatedTag = "#d";
		const archiveTag = "#Archive";
		const blockerTag = "#blocker";

		interface Item {
			text: string;
			startDatetime?: Date;
			endDatetime?: Date;

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

		await app.vault.read(file).then(async (content: string) => {
			const lines = content.split("\n");
			let output = "";
			if (
				content !== lastModifiedContent &&
				lines[2] === this.KANBAN_PLUGIN_TAG
			) {
				let kanban: Kanban = getKanban(lines);
				kanban = rolloverTasks(kanban);
				kanban = archiveTasks(kanban);
				kanban = addCompleatedTime(kanban);

				kanban = addStartingTime(kanban);
				//const updatedContent =
				output = writeKanBan(lines, kanban);
			}

			const updatedContent = output;
			if (updatedContent !== content) {
				await app.vault.modify(file, updatedContent);
				lastModifiedContent = updatedContent;
				new Notice("Tags have been propagated!");
			}
		});

		function addCompleatedTime(kan: Kanban): Kanban {
			Object.keys(kan.headings).forEach((key) => {
				const items = kan.headings[key].items;
				for (let i = 0; i < items.length; i++) {
					const item = items[i];
					const today = new Date();

					if (kan.headings[key].tag !== compleatedTag) {
						return;
					}
					if (!item.endDatetime) {
						kan.headings[key].items[i].endDatetime = today;
					}
				}
			});
			return kan;
		}

		function writeKanBan(content: string[], kan: Kanban): string {
			let output = "";
			output = "---\n\nkanban-plugin: basic\n\n---\n";
			// Extract keys and sort them by their indices
			const sortedKeys = Object.keys(kan.headings).sort(
				(a, b) => kan.headings[a].index - kan.headings[b].index
			);

			// Print each key's tag in the sorted order
			sortedKeys.forEach((key) => {
				const items = kan.headings[key].items;
				if (key.includes("Archive")) {
					output += "\n\n***\n";
				}
				output += "## " + key + "\n";
				if (kan.completeLoc && key.includes(compleatedTag)) {
					output += "**Complete**\n";
				}

				// Loop through the items for the current heading in kan.headings
				for (let i = 0; i < items.length; i++) {
					const item = items[i];
					output += item.isChecked ? "- [x] " : "- [ ] ";
					output += item.text;
					if (item.startDatetime) {
						output += " 🛫 " + dateToText(item.startDatetime);
					}
					if (item.endDatetime) {
						output += " ✅ " + dateToText(item.endDatetime);
					}
					if (kan.headings[key].tag) {
						output += " " + kan.headings[key].tag;
					}
					output += "\n";
				}
				// output += "";
			});

			output +=
				'\n\n%%% kanban:settings\n```\n{"kanban-plugin":"basic","hide-tags-in-title":true,"show-checkboxes":false}\n```\n%%%';

			return output;
		}

		function dateToText(date: Date): string {
			const day = String(date.getDate()).padStart(2, "0");
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const year = date.getFullYear();

			let hours = date.getHours();
			const ampm = hours >= 12 ? "pm" : "am";
			hours = hours % 12;
			hours = hours || 12; // Convert 0 to 12 for 12 AM
			const minutes = String(date.getMinutes()).padStart(2, "0");

			return `${day}-${month}-${year} ${hours}:${minutes}${ampm}`;
		}

		function addStartingTime(kan: Kanban): Kanban {
			Object.keys(kan.headings).forEach((key) => {
				const items = kan.headings[key].items;
				for (let i = 0; i < items.length; i++) {
					const item = items[i];
					const today = new Date();

					if (kan.headings[key].tag !== inProgressTag) {
						return;
					}
					if (!item.startDatetime) {
						kan.headings[key].items[i].startDatetime = today;
					}
				}
			});
			return kan;
		}

		function archiveTasks(kan: Kanban): Kanban {
			console.log(kan);
			Object.keys(kan.headings).forEach((key) => {
				const items = kan.headings[key].items;
				for (let i = items.length - 1; i >= 0; i--) {
					const item = items[i];
					const today = new Date();

					if (
						item.endDatetime &&
						!isSameDay(item.endDatetime, today)
					) {
						kan.headings["Archive"].items.push(item);
						kan.headings[key].items.splice(i, 1);
					}
				}
			});
			console.log(kan);
			return kan;
		}

		function rolloverTasks(kan: Kanban): Kanban {
			console.log(kan);

			Object.keys(kan.headings).forEach((key) => {
				const items = kan.headings[key].items;
				for (let i = items.length - 1; i >= 0; i--) {
					const item = items[i];
					const today = new Date();

					if (
						item.endDatetime ||
						kan.headings[key].tag === blockerTag
					) {
						continue;
					}

					if (
						item.startDatetime &&
						!isSameDay(item.startDatetime, today)
					) {
						delete item.startDatetime;
						kan.headings["Backlog #b"].items.push(item); // Update the item directly in the items array
						kan.headings[key].items.splice(i, 1);
					}
				}
			});
			console.log(kan);

			return kan;
		}

		function isSameDay(date1: Date, date2: Date) {
			const date1Copy = new Date(date1.getTime());
			const date2Copy = new Date(date2.getTime());

			date1Copy.setHours(0, 0, 0, 0);
			date2Copy.setHours(0, 0, 0, 0);

			return date1Copy.getTime() === date2Copy.getTime();
		}

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
					console.log(header);
					kanban.headings[currentHeader] = {
						items: [],
						index: headingIndex,
						tag: currentTag,
					};
					headingIndex++;
					continue;
				}

				appendItem(line, kanban, currentTag, currentHeader);

				if (line.startsWith("**Complete**")) {
					kanban.completeLoc = currentHeader;
				}
			}
			console.log(kanban);
			return kanban;
		}

		function appendItem(
			line: string,
			kanban: Kanban,
			currentTag: string,
			currentHeader: string
		) {
			if (isListItemOrTask(line)) {
				const startDatetimeMatch = line.match(
					/🛫 (\d{2}-\d{2}-\d{4}) (\d{1,2}:\d{2}[ap]m)/
				);
				const endDatetimeMatch = line.match(
					/✅ (\d{2}-\d{2}-\d{4}) (\d{1,2}:\d{2}[ap]m)/
				);
				const textMatch = line.match(
					/- \[[x ]\]\s*(.*?)(?=\s*(#\w+\s*)*(🛫 \d{2}-\d{2}-\d{4} \d{1,2}:\d{2}[ap]m|✅ \d{2}-\d{2}-\d{4} \d{1,2}:\d{2}[ap]m|$))/
				);

				const newLine: Item = {
					text: textMatch ? textMatch[1] : "",
					isChecked: isChecked(line),
				};

				if (startDatetimeMatch) {
					newLine.startDatetime = combineDateAndTime(
						parseDate(startDatetimeMatch[1]),
						parseTime(startDatetimeMatch[2])
					);
				}

				if (endDatetimeMatch && currentTag !== inProgressTag) {
					newLine.endDatetime = combineDateAndTime(
						parseDate(endDatetimeMatch[1]),
						parseTime(endDatetimeMatch[2])
					);
				}

				// if (currentTag === inProgressTag && !newLine.startDatetime) {
				// 	newLine.startDatetime = getCurrentDatetime();
				// }

				kanban.headings[currentHeader].items.push(newLine);
			}
		}

		function parseDate(dateStr: string): Date {
			const [day, month, year] = dateStr.split("-").map(Number);
			return new Date(year, month - 1, day);
		}

		function parseTime(timeStr: string): Date {
			const [hourStr, minuteStr] = timeStr.slice(0, -2).split(":");
			const isPM = timeStr.toLowerCase().endsWith("pm");
			let hour = parseInt(hourStr, 10);
			if (isPM && hour !== 12) {
				hour += 12;
			} else if (!isPM && hour === 12) {
				hour = 0;
			}
			const minute = parseInt(minuteStr, 10);

			const date = new Date();
			date.setHours(hour, minute, 0, 0);
			return date;
		}

		function combineDateAndTime(date: Date, time: Date): Date {
			const combinedDate = new Date(date);
			combinedDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
			return combinedDate;
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
		const getCurrentDatetime = (): Date => {
			return new Date();
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

// const getCurrentDatetime = () => {
// 	const currentDate = new Date();
// 	const day = String(currentDate.getDate()).padStart(2, "0");
// 	const month = String(currentDate.getMonth() + 1).padStart(2, "0");
// 	const year = currentDate.getFullYear();
// 	let hours = currentDate.getHours();
// 	const ampm = hours >= 12 ? "pm" : "am";
// 	hours = hours % 12;
// 	hours = hours || 12;
// 	const minutes = String(currentDate.getMinutes()).padStart(2, "0");
// 	return `${day}-${month}-${year} ${hours}:${minutes}${ampm}`;
// };
