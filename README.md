# 🩺 Vital Signs (Demo)

Assist a clinician during triage using **one-hand gestures** (MediaPipe), **speech-to-text** for the clinician, and an **LLM-generated follow-up question** based on a short patient history.

**Live demo:** https://ehr-asl-woad.vercel.app/

---

## Features
- **Patient gestures (webcam)** via MediaPipe Tasks Vision  
  - Built-in hand gestures (e.g., `Closed_Fist → "cough"`), stability gating.  
  - Fused **index-finger → nose** rule (hand + face detector) → `"allergy"`.
- **Clinician ASR (mic)** via Web Speech API (Chrome).
- **Follow-up suggestion** via a small Vercel serverless proxy hitting an LLM.
- **Health Record** free-text panel + **Append from Entities**.
- **Export JSON** (notes + segments + entities).

---

## Tech
- Vite + React + TypeScript  
- `@mediapipe/tasks-vision`  
- Web Speech API (Chrome)  
- Pico.css (tiny CSS framework)  
- Vercel Functions (proxy for LLM) / GitHub Pages (static)

---

## Quick start (local)

**Requirements:** Node 18+, Chromium browser. Use HTTPS/localhost for cam/mic.

~~~bash
git clone <your-fork-or-repo>
cd ehr-asl
npm i
npm run dev
~~~

Open http://localhost:5173 and allow **camera** + **microphone**.

## How to use
1. Click **Start** (visit controls).
2. **Doctor ASR** → **Enable Mic**.
3. **Gestures** → **Start Gesture Capture**.  
4. When a **symptom** is emitted, a **follow-up question** appears.
5. Use **Health Record**; optionally **Append from Entities**.
6. **Download JSON** at the bottom.

---

## Safety
This demo is **not a medical device**. Keep an interpreter/clinician involved. Don’t send PHI to third parties without proper consent.

---

## License
MIT
