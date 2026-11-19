# CampusPulse AWS — Smart Campus Infrastructure & Telemetry Hub

Built for the **Techfest IIT Bombay AWS ShipIt Challenge** by **@palak9900**.

An interactive dark-mode AWS Cloud Console dashboard featuring a clean **3-Tab Workspace** (**1. Smart Library Map**, **2. Hostel Wi-Fi Monitor**, **3. Mess & Waste Tracker**), an interactive **Three.js 3D Campus Digital Twin**, downloadable/printable **Digital QR Seat Passes**, an **Ask Bedrock AI** assistant, and a **5-Node AWS Architecture** flow diagram.

## Key Features

- **1. Smart Library Map**: 3 floor tabs with a cinema-style interactive chair grid (`Cyan = Free`, `Slate = Busy`, `Orange = Your Seat`), power/AC filtering, and a pop-up downloadable PNG & printable **Digital QR Seat Pass** persisted in `localStorage`.
- **2. Hostel Wi-Fi Monitor**: 6 hostel block cards (Hostel A–F) with live Mbps/ping metrics, animated **Run Speed Test** gauge, and an instant **Report Outage** form updating block health in real time.
- **3. Mess & Waste Tracker**: Meal tabs with 5-star dish ratings, a **Will Eat / Skip Meal** toggle, and a custom SVG **Food Waste Saved** chart.
- **3D Smart Campus Digital Twin (`Three.js` WebGL)**: Optional interactive 360° campus view with live hostel beacons, explodable 3-floor library tower, and fiber-optic packet streams.
- **Ask Bedrock AI**: Floating bottom-right assistant answering live campus status queries.
- **AWS Architecture Modal**: 5-node interactive visual flow diagram showing **AWS Amplify**, **Amazon API Gateway**, **AWS Lambda**, **Amazon DynamoDB**, and **Amazon S3**.

## Security & Local VS Code Run

- **Zero Secrets & XSS Safe**: No hardcoded API keys, no `dangerouslySetInnerHTML`, no `eval`, no `window.open`, and strict schema validation on `localStorage` state hydration plus clamped form inputs.
- **VS Code Local Run**:
  1. `npm install`
  2. `npm run dev` (opens at `http://localhost:3000`)
  3. `npm run lint && npm run build`

## Safe GitHub Push & AWS Amplify Deployment

- `.gitignore` excludes `node_modules/`, `dist/`, `.env*` (keeping only `.env.example`), `.vscode/`, `.idea/`, and `*.tsbuildinfo`.
- Connect your GitHub repository in **AWS Amplify Hosting** with build command `npm run build` and output directory `dist`.
