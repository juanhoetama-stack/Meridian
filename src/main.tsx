import { render } from "preact";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";

function App() {
  return <main style={{ padding: "48px" }}><h1 class="serif">Meridian</h1><p>Scaffold ready.</p></main>;
}

render(<App />, document.getElementById("app")!);
