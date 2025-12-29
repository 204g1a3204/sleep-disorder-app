const express = require('express');
const cors = require('cors'); 
const app = express();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

app.use(cors({ origin: "*" })); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'www')));

const USERS_DB = path.join(__dirname, 'www', 'database.json');
const REPORTS_DB = path.join(__dirname, 'www', 'reports.json');

if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, JSON.stringify([]));
if (!fs.existsSync(REPORTS_DB)) fs.writeFileSync(REPORTS_DB, JSON.stringify([]));

const readData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
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
    } catch (err) { res.status(500).json({ success: false, error: "Registration Failed" }); }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const users = readData(USERS_DB);
    const user = users.find(u => u.email === email);
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ success: true, message: "Login Successful", email: email });
    } else {
        res.status(401).json({ success: false, error: "Invalid Credentials" });
    }
});

// --- DASHBOARD (With All Your Input Parameters) ---
app.get('/dashboard', (req, res) => {
    const userEmail = req.query.user;
    if (!userEmail) return res.redirect('/');
    const allReports = readData(REPORTS_DB);
    const userReports = allReports.filter(r => r.email === userEmail);

    let reportRows = userReports.map((r) => `
        <tr style="border-bottom: 1px solid #333;">
            <td style="padding:10px;">${r.date}</td>
            <td style="padding:10px; color:#f39c12;">${r.result}</td>
            <td style="padding:10px;"><a href="/view-report?id=${r.id}" style="color:#3498db; text-decoration:none; font-weight:bold; border:1px solid #3498db; padding:2px 8px; border-radius:4px;">View Report</a></td>
        </tr>`).join('');

    res.send(`
        <body style="background:#050a14; color:white; font-family:Arial; padding:20px;">
            <div style="max-width:1100px; margin:auto; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:10px;">
                <h2>Welcome, <span style="color:#f39c12;">${userEmail}</span></h2>
                <a href="/" style="color:#ff4d4d; text-decoration:none; font-weight:bold;">LOGOUT</a>
            </div>
            <div style="display:grid; grid-template-columns: 1fr; gap:20px; max-width:1100px; margin:20px auto;">
                <div style="background:#0b1120; padding:20px; border-radius:10px; border:1px solid #333;">
                    <h3 style="color:#f39c12;">New Sleep Analysis</h3><br>
                    <form action="/predict" method="POST" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                        <input type="hidden" name="email" value="${userEmail}">
                        <div><label>Phone</label><input type="tel" name="phone_number" required style="width:100%; padding:8px; background:#16213e; color:white; border:1px solid #333;"></div>
                        <div><label>Age</label><input type="number" name="age" required style="width:100%; padding:8px; background:#16213e; color:white; border:1px solid #333;"></div>
                        <div><label>Gender</label><select name="gender" style="width:100%; padding:8px; background:#16213e; color:white; border:1px solid #333;"><option>Male</option><option>Female</option></select></div>
                        <div><label>Occupation</label><input type="text" name="occupation" required style="width:100%; padding:8px; background:#16213e; color:white; border:1px solid #333;"></div>
                        <div><label>Stress (1-10)</label><input type="number" name="stress" required style="width:100%; padding:8px; background:#16213e; color:white; border:1px solid #333;"></div>
                        <div><label>BP (120/80)</label><input type="text" name="bp" required style="width:100%; padding:8px; background:#16213e; color:white; border:1px solid #333;"></div>
                        <div><label>Heart Rate</label><input type="number" name="heart_rate" required style="width:100%; padding:8px; background:#16213e; color:white; border:1px solid #333;"></div>
                        <div><label>Sleep Duration</label><input type="number" step="0.1" name="sleep_duration" required style="width:100%; padding:8px; background:#16213e; color:white; border:1px solid #333;"></div>
                        <div><label>BMI Category</label><select name="bmi" style="width:100%; padding:8px; background:#16213e; color:white; border:1px solid #333;"><option>Normal</option><option>Overweight</option><option>Obese</option></select></div>
                        <div><label>Snoring</label><select name="snoring" style="width:100%; padding:8px; background:#16213e; color:white; border:1px solid #333;"><option>Never</option><option>Sometimes</option><option>Every Night</option></select></div>
                        <button type="submit" style="grid-column: span 2; background:#f39c12; color:white; border:none; padding:12px; font-weight:bold; cursor:pointer; border-radius:5px;">GENERATE PREDICTION</button>
                    </form>
                </div>
                <div style="background:#0b1120; padding:20px; border-radius:10px; border:1px solid #333;">
                    <h3 style="color:#f39c12;">History</h3>
                    <table style="width:100%; margin-top:10px; border-collapse:collapse;">
                        <thead><tr style="text-align:left; color:#888;"><th>Date</th><th>Result</th><th>Action</th></tr></thead>
                        <tbody>${reportRows || '<tr><td colspan="3">No records.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </body>
    `);
});

// --- PREDICTION ---
app.post('/predict', (req, res) => {
    const data = req.body;
    const sleep = Number(data.sleep_duration);
    const stress = Number(data.stress);
    const bmiCategory = data.bmi;

    let result = "Healthy Sleep Pattern";
    let riskLevel = "Low";
    let tips = ["Maintain your routine."];

    if (bmiCategory.includes("Obese") && data.snoring === "Every Night") {
        result = "High Risk: Possible Sleep Apnea";
        riskLevel = "High";
        tips = ["Consult a specialist.", "Avoid sleeping on your back."];
    } else if (sleep < 5) {
        result = "High Risk: Severe Sleep Deprivation";
        riskLevel = "High";
        tips = ["Get 7-8 hours sleep.", "Consult a doctor."];
    } else if (stress > 7) {
        result = "High Risk: Insomnia Indicators";
        riskLevel = "High";
        tips = ["Practice relaxation techniques."];
    }

    let reports = readData(REPORTS_DB);
    const newReport = { ...data, id: Date.now().toString(), result, riskLevel, recommendations: tips, date: new Date().toLocaleDateString() };
    reports.push(newReport);
    writeData(REPORTS_DB, reports);
    res.redirect(`/view-report?id=${newReport.id}`);
});

// --- REPORT VIEW (Full Design) ---
app.get('/view-report', (req, res) => {
    const r = readData(REPORTS_DB).find(report => report.id === req.query.id);
    if (!r) return res.send("Report not found");
    const isHighRisk = r.riskLevel === 'High';
    const themeColor = isHighRisk ? '#e74c3c' : '#27ae60';
    
    res.send(`
        <body style="background:#e0e4e8; font-family:Arial; padding:20px;">
            <div style="max-width:800px; margin:auto; background:white; border-radius:15px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
                <div style="height:10px; background:${themeColor};"></div>
                <div style="padding:30px;">
                    <h1 style="color:#1a2a6c; margin:0;">A1 HOSPITAL</h1>
                    <p style="color:#888;">Sleep Research Center</p>
                    <hr>
                    <div style="display:flex; justify-content:space-between; background:#f8f9fa; padding:15px; border-radius:8px;">
                        <span>Patient: <b>${r.email}</b></span>
                        <span>Date: <b>${r.date}</b></span>
                    </div>
                    <div style="text-align:center; padding:30px;">
                        <h2 style="color:${themeColor}; font-size:28px;">${r.result}</h2>
                        <span style="background:${themeColor}; color:white; padding:5px 15px; border-radius:20px;">${r.riskLevel} Risk</span>
                    </div>
                    <h3>Recommendations:</h3>
                    <ul>${r.recommendations.map(t => `<li>${t}</li>`).join('')}</ul>
                    <br>
                    <button onclick="window.print()" style="width:100%; padding:15px; background:#1a2a6c; color:white; border:none; border-radius:5px; cursor:pointer;">DOWNLOAD REPORT</button>
                    <br><br>
                    <a href="/dashboard?user=${r.email}" style="display:block; text-align:center; color:#555;">Back to Dashboard</a>
                </div>
            </div>
        </body>
    `);
});

// --- ADMIN PORTAL ---
app.get('/admin-login', (req, res) => {
    res.send(`
        <body style="background:#050a14; color:white; text-align:center; padding-top:100px; font-family:Arial;">
            <div style="width:350px; margin:auto; background:#0b1120; padding:40px; border-radius:10px; border:1px solid #f39c12;">
                <h2 style="color:#f39c12;">Admin Login</h2><br>
                <form action="/admin-portal" method="POST">
                    <input type="email" name="adminEmail" placeholder="Admin Email" required style="width:100%; padding:12px; margin-bottom:15px; background:#16213e; color:white; border:1px solid #333;">
                    <input type="password" name="adminKey" placeholder="Password" required style="width:100%; padding:12px; margin-bottom:20px; background:#16213e; color:white; border:1px solid #333;">
                    <button type="submit" style="width:100%; background:#f39c12; color:white; padding:12px; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">LOGIN</button>
                </form>
            </div>
        </body>
    `);
});

app.post('/admin-portal', (req, res) => {
    const { adminEmail, adminKey } = req.body;
    if (adminEmail !== "admin@hospital.com" || adminKey !== "admin123") return res.send("Access Denied");
    
    const reports = readData(REPORTS_DB);
    const highRiskCount = reports.filter(r => r.riskLevel === 'High').length;
    const healthyCount = reports.length - highRiskCount;

    let tableRows = reports.reverse().map(r => `
        <tr style="border-bottom:1px solid #333;">
            <td style="padding:10px;">${r.email}<br><small>${r.phone_number || ''}</small></td>
            <td style="padding:10px; color:${r.riskLevel === 'High' ? '#ff4d4d' : '#2ecc71'}">${r.result}</td>
            <td style="padding:10px;"><a href="/view-report?id=${r.id}" style="color:#f39c12;">View</a></td>
        </tr>`).join('');

    res.send(`
        <body style="background:#050a14; color:white; font-family:Arial; padding:20px;">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <h2 style="color:#f39c12;">Admin Dashboard</h2>
            <div style="display:flex; gap:20px; margin-bottom:20px;">
                <div style="background:#0b1120; padding:20px; border-radius:10px; border:1px solid #333; width:300px;">
                    <canvas id="riskChart"></canvas>
                </div>
                <div style="flex-grow:1; background:#0b1120; padding:20px; border-radius:10px; border:1px solid #333;">
                    <h3>Patient Records</h3>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead><tr style="color:#888; text-align:left;"><th>Patient</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            </div>
            <script>
                new Chart(document.getElementById('riskChart'), {
                    type: 'doughnut',
                    data: { labels: ['High Risk', 'Healthy'], datasets: [{ data: [${highRiskCount}, ${healthyCount}], backgroundColor: ['#ff4d4d', '#2ecc71'] }] },
                    options: { plugins: { title: { display: true, text: 'Overall Risk Status', color: '#fff' } } }
                });
            </script>
        </body>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
