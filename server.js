const express = require('express');
const cors = require('cors'); 
const app = express();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// --- MIDDLEWARE ---
app.use(cors({ origin: "*" })); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'www')));

// --- DATABASE PATHS ---
const USERS_DB = path.join(__dirname, 'www', 'database.json');
const REPORTS_DB = path.join(__dirname, 'www', 'reports.json');

if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, JSON.stringify([]));
if (!fs.existsSync(REPORTS_DB)) fs.writeFileSync(REPORTS_DB, JSON.stringify([]));

const readData = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { return []; }
};
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- AUTHENTICATION ---
app.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        let users = readData(USERS_DB);
        if (users.find(u => u.email === email)) return res.status(400).json({ success: false, error: "User Already Exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        users.push({ name, email, phone, password: hashedPassword });
        writeData(USERS_DB, users);
        res.json({ success: true, message: "Registration Successful!" });
    } catch (err) { res.status(500).json({ success: false, error: "Server Error" }); }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = readData(USERS_DB);
        const user = users.find(u => u.email === email);
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({ success: true, message: "Login Successful", email: email });
        } else {
            res.status(401).json({ success: false, error: "Invalid Credentials" });
        }
    } catch (err) { res.status(500).json({ success: false, error: "Server Error" }); }
});

// --- PREDICTION LOGIC ---
app.post('/predict', (req, res) => {
    const data = req.body;
    const sleep = Number(data.sleep_duration);
    const stress = Number(data.stress);
    
    let result = "Healthy Sleep Pattern";
    let riskLevel = "Low";
    let tips = ["Maintain a consistent sleep schedule."];

    if (sleep < 5) {
        result = "High Risk: Severe Sleep Deprivation";
        riskLevel = "High";
        tips = ["Prioritize 7-8 hours of sleep.", "Consult a doctor."];
    } else if (stress > 7) {
        result = "High Risk: Insomnia Indicators";
        riskLevel = "High";
        tips = ["Practice relaxation techniques."];
    }

    let reports = readData(REPORTS_DB);
    const newReport = { ...data, id: Date.now().toString(), result, riskLevel, recommendations: tips, date: new Date().toLocaleDateString() };
    reports.push(newReport);
    writeData(REPORTS_DB, reports);
    res.json({ success: true, reportId: newReport.id });
});

// --- ROUTES FOR PAGES ---
app.get('/view-report', (req, res) => {
    const r = readData(REPORTS_DB).find(report => report.id === req.query.id);
    if (!r) return res.send("Report not found");
    res.send(`<body style="font-family:Arial; padding:40px; background:#f4f4f4;">
        <div style="background:white; padding:20px; border-radius:10px; max-width:600px; margin:auto; border-top:10px solid #1a2a6c;">
            <h2>A1 HOSPITAL - SLEEP REPORT</h2>
            <hr><p><b>Patient:</b> ${r.email}</p><p><b>Result:</b> ${r.result}</p>
            <p><b>Risk:</b> ${r.riskLevel}</p><p><b>Tips:</b> ${r.recommendations.join(', ')}</p>
            <button onclick="window.print()">Download PDF</button>
        </div></body>`);
});

app.get('/dashboard', (req, res) => {
    const userEmail = req.query.user;
    res.send(`<body style="background:#050a14; color:white; padding:40px; font-family:Arial;">
        <h2>Welcome, ${userEmail}</h2>
        <form action="/predict" method="POST" style="background:#0b1120; padding:20px; border-radius:10px; border:1px solid #333;">
            <input type="hidden" name="email" value="${userEmail}">
            <label>Sleep Duration (Hrs):</label><br><input type="number" name="sleep_duration" required><br><br>
            <label>Stress Level (1-10):</label><br><input type="number" name="stress" required><br><br>
            <button type="submit" style="background:#f39c12; color:white; padding:10px 20px; border:none; cursor:pointer;">Predict</button>
        </form>
    </body>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
