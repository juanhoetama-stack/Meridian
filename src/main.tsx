import { render } from "preact";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/kit.css";
import "./styles/overlays.css";
import "./styles/pages/import.css";
import "./styles/pages/add.css";
import "./styles/pages/db.css";
import { App } from "./ui/App";
import { init } from "./store/state";
import { installProvHandler } from "./ui/overlays/popover";

installProvHandler();
render(<App />, document.getElementById("app")!);
init();
