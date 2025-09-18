import DBStatusButton from "./components/DbStatusButton/DbStatusButton.jsx";

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-3">Database Status</h1>
      <DBStatusButton endpoint="/api/db/health" />
    </div>
  );
}
