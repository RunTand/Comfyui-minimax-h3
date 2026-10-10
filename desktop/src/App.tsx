import { useEffect, useState } from "react";
import ConnectPage from "./pages/ConnectPage";
import StudioPage from "./pages/StudioPage";
import SettingsPanel from "./pages/SettingsPanel";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:8188");
  const [probeMessage, setProbeMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    window.manju.status().then((s) => {
      setConnected(s.connected);
      setBaseUrl(s.baseUrl);
    });
  }, []);

  return (
    <>
      {!connected ? (
        <ConnectPage
          onOpenSettings={() => setShowSettings(true)}
          onConnected={(info) => {
            setConnected(true);
            setBaseUrl(info.baseUrl);
            setProbeMessage(info.probe.message);
          }}
        />
      ) : (
        <StudioPage
          baseUrl={baseUrl}
          initialMessage={probeMessage}
          onDisconnect={async () => {
            await window.manju.disconnect();
            setConnected(false);
          }}
        />
      )}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
}
