import "./style.css";
import { createGame } from "./game/createGame";

const container = document.querySelector<HTMLElement>("#game-container");

if (!container) {
  throw new Error("Missing #game-container element.");
}

const game = createGame(container.id);

window.addEventListener("beforeunload", () => {
  game.destroy(true);
});
