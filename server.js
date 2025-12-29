const express = require('express');
const cors = require('cors'); 
const app = express();

app.use(cors()); 
app.use(express.json());
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');


app.use(bodyParser.urlencoded({ extended: true }));
// This line allows the server to serve your index.html correctly
app.use(express.static(path.join(__dirname, 'www')));
const USERS_DB = './database.json';
const REPORTS_DB = './reports.json';

if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, JSON.stringify([]));
if (!fs.existsSync(REPORTS_DB)) fs.writeFileSync(REPORTS_DB, JSON.stringify([]));

const readData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// --- AUTHENTICATION ---
app.post('/register', async (req, res) => {
    const { name, email, phone, password } = req.body;

    // 1. Email Validation (Standard format)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // 2. Phone Validation (Exactly 10 digits)
    const phoneRegex = /^[0-9]{10}$/;

    // 3. Password Validation (Min 8 chars, 1 Letter, 1 Number, 1 Special Symbol)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

    if (!emailRegex.test(email)) {
        return res.send('<h1>Invalid Email Format</h1><a href="/">Go Back</a>');
    }
    if (!phoneRegex.test(phone)) {
        return res.send('<h1>Phone Number must be 10 digits</h1><a href="/">Go Back</a>');
    }
    if (!passwordRegex.test(password)) {
        return res.send('<h1>Password too weak! Must include letters, numbers, and a special symbol.</h1><a href="/">Go Back</a>');
    }

    let users = readData(USERS_DB);
    if (users.find(u => u.email === email)) {
        return res.send('<h1>User Already Exists</h1><a href="/">Back</a>');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ name, email, phone, password: hashedPassword });
    writeData(USERS_DB, users);
    
    res.send('<h1>Registration Successful!</h1><a href="/">Login Now</a>');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const users = readData(USERS_DB);
    const user = users.find(u => u.email === email);
    
    if (user && await bcrypt.compare(password, user.password)) {
        // We encode the URI to handle special characters in emails
        res.redirect(`/dashboard?user=${encodeURIComponent(email)}`);
    } else {
        res.send('<h1>Invalid Credentials</h1><a href="/">Try Again</a>');
    }
});

// --- DASHBOARD 
app.get('/dashboard', (req, res) => {
    const userEmail = req.query.user;
    if (!userEmail) return res.redirect('/');

    const allReports = readData(REPORTS_DB);
    const userReports = allReports.filter(r => r.email === userEmail);

    let reportRows = userReports.map((r) => `
        <tr style="border-bottom: 1px solid #333;">
            <td style="padding:10px;">${r.date}</td>
            <td style="padding:10px; color:#f39c12;">${r.result}</td>
            <td style="padding:10px;">
                <a href="/view-report?id=${r.id}" style="color:#3498db; text-decoration:none; font-weight:bold; border:1px solid #3498db; padding:2px 8px; border-radius:4px;">
                    View Report
                </a>
            </td>
        </tr>`).join('');

    res.send(`
        <body style="background:#050a14; color:white; font-family:Arial; padding:40px;">
            <div style="max-width:1100px; margin:auto; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:20px;">
                <h2>Welcome, <span style="color:#f39c12;">${userEmail}</span></h2>
                <a href="/" style="color:#ff4d4d; text-decoration:none; font-weight:bold; border:1px solid #ff4d4d; padding:5px 15px; border-radius:5px;">LOGOUT</a>
            </div>

            <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:30px; max-width:1100px; margin:30px auto;">
                
                <div style="background:#0b1120; padding:25px; border-radius:10px; border:1px solid #333;">
                    <h3 style="color:#f39c12; margin-bottom:20px;">New Sleep Analysis</h3>
                    <form action="/predict" method="POST" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                        <input type="hidden" name="email" value="${userEmail}">
                <div style="grid-column: span 2;">
                    <label>Phone Number (Mandatory for Doctor Consultation)</label>
                    <input type="tel" name="phone_number" placeholder="Enter your 10-digit mobile number" 
                    pattern="[0-9]{10}" maxlength="10" required 
                    style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;">
                </div>

                        <div><label>Age</label><input type="number" name="age" required style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;"></div>
                        <div><label>Gender</label><select name="gender" style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;"><option>Male</option><option>Female</option></select></div>
                        
                        <div><label>Occupation</label><input type="text" name="occupation" required style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;"></div>
                        <div><label>Stress level (1-10)</label><input type="number" name="stress" required style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;"></div>
                        
                        <div><label>Blood Pressure</label><input type="text" name="bp" placeholder="120/80" required style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;"></div>
                        <div><label>Heart Rate</label><input type="number" name="heart_rate" required style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;"></div>
                        
                        <div><label>Sleep Duration (Hrs)</label><input type="number" step="0.1" name="sleep_duration" required style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;"></div>
                        
                        <div><label>Tea or Coffee (Cups/day)</label><input type="number" name="tea_coffee" required style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;"></div>

                        <div><label>BMI Category</label>
                            <select name="bmi" style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;">
                                <option>Underweight (Below 18.5)</option>
                                <option>Normal (18.5 - 24.9)</option>
                                <option>Overweight (25.0 - 29.9)</option>
                                <option>Obese Class I (30.0 - 34.9)</option>
                                <option>Obese Class II (35.0 - 39.9)</option>
                                <option>Obese Class III / Extremely Obese (Above 40.0)</option>
                            </select>
                        </div>
                        
                        <div><label>Snoring Frequency</label>
                            <select name="snoring" style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;">
                                <option>Never</option><option>Sometimes</option><option>Every Night</option>
                            </select>
                        </div>

                        <div style="grid-column: span 2;">
                            <label>Working Hours (Per Week)</label>
                            <input type="number" name="work_hours" placeholder="e.g. 40" required style="width:100%; padding:10px; background:#16213e; color:white; border:1px solid #333;">
                        </div>

                        <button type="submit" style="grid-column: span 2; background:#f39c12; color:white; border:none; padding:15px; cursor:pointer; font-weight:bold; border-radius:5px; font-size:1rem; margin-top:10px;">
                            GENERATE PREDICTION
                        </button>
                    </form>
                </div>

                <div style="background:#0b1120; padding:25px; border-radius:10px; border:1px solid #333; overflow-y:auto; max-height:650px;">
                    <h3 style="color:#f39c12; margin-bottom:20px;">Analysis History</h3>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead style="text-align:left; color:#888; border-bottom:1px solid #333;">
                            <tr>
                                <th style="padding:10px;">Date</th>
                                <th style="padding:10px;">Result</th>
                                <th style="padding:10px;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportRows || '<tr><td colspan="3" style="padding:20px; text-align:center; color:#555;">No records found.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </body>
    `);
});
// --- PREDICTION ---
app.post('/predict', (req, res) => {
    const data = req.body;
    const stress = Number(data.stress);
    const sleep = Number(data.sleep_duration);
    const teaCoffee = Number(data.tea_coffee); 
    const bmiCategory = data.bmi;

    let result = "Healthy Sleep Pattern";
    let riskLevel = "Low";
    let tips = [];

    // 1. Sleep Apnea Logic
    if (bmiCategory.includes("Obese") && data.snoring === "Every Night") {
        result = "High Risk: Possible Sleep Apnea";
        riskLevel = "High";
        tips = ["Consult a specialist for CPAP therapy.", "Avoid sleeping on your back.", "Weight management is advised."];
    } 
    // 2. STERN SLEEP CHECK (Ikkada update chesam)
    else if (sleep < 5) { 
        result = "High Risk: Severe Sleep Deprivation";
        riskLevel = "High";
        tips = ["Prioritize 7-8 hours of sleep.", "Consult a doctor about your sleep schedule.", "Avoid using screens 1 hour before bed."];
    }
    // 3. Insomnia (Stress logic)
    else if (stress > 7 && sleep < 6.5) {
        result = "High Risk: Insomnia Indicators";
        riskLevel = "High";
        tips = ["Practice relaxation techniques.", "Reduce evening stress.", "Limit caffeine intake."];
    }
    // 4. Moderate Risk (Tea/Coffee)
    else if (teaCoffee > 4) {
        result = "Moderate Risk: Caffeine Disruption";
        riskLevel = "Moderate";
        tips = ["Limit tea/coffee to 2 cups a day.", "Avoid caffeine after 4 PM."];
    }
    // Default Tips for Healthy users
    if(tips.length === 0) {
        tips = ["Maintain your current routine.", "Keep a consistent sleep schedule."];
    }

    // Save and Redirect
    let reports = readData(REPORTS_DB);
    const newReport = { ...data, id: Date.now().toString(), result, riskLevel, recommendations: tips, date: new Date().toLocaleDateString() };
    reports.push(newReport);
    writeData(REPORTS_DB, reports);
    res.redirect(`/view-report?id=${newReport.id}`);
});
// --- REPORT VIEW ---
app.get('/view-report', (req, res) => {
    const reportId = req.query.id;
    const reports = readData(REPORTS_DB);
    const r = reports.find(report => report.id === reportId);
    
    if (!r) return res.send("Report not found");

    const isHighRisk = r.riskLevel === 'High' || r.result.includes('High');
    const themeColor = isHighRisk ? '#e74c3c' : '#27ae60'; // Red for High Risk, Green for Healthy
    const bgColor = isHighRisk ? '#fff5f5' : '#f4fbf7'; // Light background colors

    res.send(`
        <body style="background:#e0e4e8; font-family: 'Segoe UI', Roboto, Helvetica, sans-serif; padding:40px;">
            <div id="printArea" style="max-width:900px; margin:auto; background:white; border-radius:15px; overflow:hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); position: relative;">
                
                <div style="height:15px; background: linear-gradient(to right, #1a2a6c, ${themeColor});"></div>

                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 100px; color: rgba(0,0,0,0.015); font-weight: 900; pointer-events: none; z-index:0;">A1 MEDICAL</div>

                <div style="padding:40px; position:relative; z-index:1;">
                    <table style="width:100%; margin-bottom: 30px;">
                        <tr>
                            <td style="width:120px;">
                                <img src="/logo.jpeg" alt="Logo" style="width:110px; height:auto; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.1));">
                            </td>
                            <td style="padding-left:20px;">
                                <h1 style="margin:0; color:#1a2a6c; font-size:35px; font-weight:800;">A1 HOSPITAL</h1>
                                <p style="margin:3px 0; color:#555; font-size:14px; font-weight:500;">ADVANCED DIAGNOSTIC & SLEEP RESEARCH CENTER</p>
                                <p style="margin:2px 0; color:#888; font-size:12px;">Anantapur, AP | +91 98765 43210 | www.a1hospital.com</p>
                            </td>
                            <td style="text-align:right;">
                                <div style="display:inline-block; border:2px solid ${themeColor}; padding:10px 20px; border-radius:10px;">
                                    <span style="display:block; font-size:10px; color:#888; text-transform:uppercase;">Report Status</span>
                                    <span style="font-size:18px; font-weight:bold; color:${themeColor};">${isHighRisk ? 'URGENT' : 'NORMAL'}</span>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <div style="background:#1a2a6c; color:white; padding:15px; border-radius:8px; display:flex; justify-content:space-between; margin-bottom:30px;">
                        <span>Patient: <b>${r.email}</b></span>
                        <span>ID: <b>${r.id}</b></span>
                        <span>Date: <b>${r.date}</b></span>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:30px;">
                        <div style="background:${bgColor}; padding:20px; border-radius:12px; border-left:5px solid ${themeColor};">
                            <h3 style="margin-top:0; color:${themeColor}; font-size:16px;">PHYSICAL PARAMETERS</h3>
                            <table style="width:100%; font-size:14px; border-collapse:collapse;">
                                <tr style="border-bottom:1px solid rgba(0,0,0,0.05);"><td style="padding:8px 0;">Age / Gender</td><td style="text-align:right;"><b>${r.age} / ${r.gender || 'M'}</b></td></tr>
                                <tr style="border-bottom:1px solid rgba(0,0,0,0.05);"><td style="padding:8px 0;">Blood Pressure</td><td style="text-align:right;"><b>${r.bp} mmHg</b></td></tr>
                                <tr style="border-bottom:1px solid rgba(0,0,0,0.05);"><td style="padding:8px 0;">Heart Rate</td><td style="text-align:right;"><b>${r.heart_rate} bpm</b></td></tr>
                                <tr><td style="padding:8px 0;">Occupation</td><td style="text-align:right;"><b>${r.occupation}</b></td></tr>
                            </table>
                        </div>
                        <div style="background:${bgColor}; padding:20px; border-radius:12px; border-left:5px solid ${themeColor};">
                            <h3 style="margin-top:0; color:${themeColor}; font-size:16px;">SLEEP & STRESS ANALYSIS</h3>
                            <table style="width:100%; font-size:14px; border-collapse:collapse;">
                                <tr style="border-bottom:1px solid rgba(0,0,0,0.05);"><td style="padding:8px 0;">Sleep Duration</td><td style="text-align:right;"><b>${r.sleep_duration} Hrs</b></td></tr>
                                <tr style="border-bottom:1px solid rgba(0,0,0,0.05);"><td style="padding:8px 0;">Stress Score</td><td style="text-align:right;"><b>${r.stress} / 10</b></td></tr>
                                <tr style="border-bottom:1px solid rgba(0,0,0,0.05);"><td style="padding:8px 0;">Snoring Level</td><td style="text-align:right;"><b>Moderate</b></td></tr>
                                <tr><td style="padding:8px 0;">BMI Category</td><td style="text-align:right;"><b>Overweight</b></td></tr>
                            </table>
                        </div>
                    </div>

                    <div style="text-align:center; padding:30px; border:2px dashed ${themeColor}; border-radius:15px; background:white; margin-bottom:30px;">
                        <p style="margin:0; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:2px;">Medical Diagnosis</p>
                        <h2 style="margin:10px 0; font-size:32px; color:${themeColor}; text-shadow: 1px 1px 2px rgba(0,0,0,0.05);">${r.result}</h2>
                        <div style="display:inline-block; background:${themeColor}; color:white; padding:5px 20px; border-radius:50px; font-size:14px; font-weight:bold;">
                            ${r.riskLevel} Risk Case
                        </div>
                    </div>

                    <div style="background:#f8f9fa; padding:25px; border-radius:12px; border: 1px solid rgba(26, 42, 108, 0.1); margin-bottom: 30px; position:relative; z-index:1;">
    <h4 style="margin-top:0; color:#1a2a6c; display:flex; align-items:center; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">
        <span style="background:${themeColor}; color:white; width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; margin-right:12px; font-size:16px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">✚</span> 
        ADVISORY & HEALTH RECOMMENDATIONS
    </h4>
    <div style="height: 2px; width: 60px; background: ${themeColor}; margin-bottom: 15px; margin-left: 42px;"></div>
    
    <ul style="padding-left:45px; color:#333; font-size:15px; line-height:1.8; font-weight: 500; list-style-type: square;">
        ${r.recommendations ? r.recommendations.map(t => `<li style="margin-bottom:10px;">${t}</li>`).join('') : 
        `<li style="margin-bottom:10px;">Maintain a consistent sleep-wake schedule to regulate your body's internal clock.</li>
         <li style="margin-bottom:10px;">Reduce exposure to blue light from screens at least 1 hour before sleep.</li>
         <li style="margin-bottom:10px;">Incorporate light physical activity during the day to improve sleep quality.</li>
         <li style="margin-bottom:10px;">If symptoms persist, please consult with our sleep specialist for a detailed polysomnography test.</li>`}
    </ul>
</div>

                    <div style="margin-top:50px; display:flex; justify-content:space-between; align-items:flex-end;">
                        <div style="width:50%;">
                            <p style="font-size:10px; color:#999; line-height:1.4;">
                                * This report is generated by A1 Hospital's Predictive AI System.<br>
                                Verification Code: A1-XP-2025-RTX<br>
                                This is a digitally signed document.
                            </p>
                        </div>
                        <div style="text-align:center; position:relative;">
                            <img src="/stamp.jpeg" alt="Stamp" style="width:160px; height:auto; position:absolute; bottom:20px; right:20px; opacity:0.85; transform: rotate(-5deg);">
                            <div style="margin-top:80px; position:relative; z-index:2;">
                                <p style="margin:0; font-weight:bold; color:#1a2a6c; border-top:1px solid #1a2a6c; padding-top:5px; width:200px;">Dr. Anil Kumar, M.D.</p>
                                <p style="margin:0; font-size:12px; color:#555;">Chief Medical Officer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-top:30px; text-align:center;" class="no-print">
                <button onclick="window.print()" style="background:linear-gradient(to right, #1a2a6c, #b21f1f); color:white; padding:15px 40px; border:none; border-radius:50px; cursor:pointer; font-weight:bold; font-size:16px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                    DOWNLOAD PROFESSIONAL REPORT
                </button>
            </div>

            <style>
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    #printArea { box-shadow: none !important; border-radius: 0 !important; width: 100% !important; margin: 0 !important; }
                }
            </style>
        </body>
    `);
});
// --- ADMIN LOGIN PAGE ROUTE ---
app.get('/admin-login', (req, res) => {
    res.send(`
        <body style="background:#050a14; color:white; text-align:center; padding-top:100px; font-family:Arial;">
            <div style="width:350px; margin:auto; background:#0b1120; padding:40px; border-radius:10px; border:1px solid #f39c12; box-shadow: 0 0 20px rgba(243, 156, 18, 0.2);">
                <h2 style="color:#f39c12; margin-bottom:20px;">Doctor / Admin Login</h2>
                <p style="color:#888; margin-bottom:20px;">Authorized Access Only</p>
                <form action="/admin-portal" method="POST">
                    <input type="email" name="adminEmail" placeholder="Admin Email (e.g. admin@hospital.com)" required 
                           style="width:100%; padding:12px; margin-bottom:15px; border-radius:5px; border:1px solid #333; background:#16213e; color:white; box-sizing:border-box;">
                    
                    <input type="password" name="adminKey" placeholder="Admin Password" required 
                           style="width:100%; padding:12px; margin-bottom:20px; border-radius:5px; border:1px solid #333; background:#16213e; color:white; box-sizing:border-box;">
                    
                    <button type="submit" 
                            style="width:100%; background:#f39c12; border:none; padding:12px; color:white; font-weight:bold; border-radius:5px; cursor:pointer;">
                        LOGIN TO PORTAL
                    </button>
                </form>
                <br>
                <a href="/" style="color:#555; text-decoration:none; font-size:0.8rem;">Return to Main Site</a>
            </div>
        </body>
    `);
});
// --- 1. ADMIN LOGIN PAGE (Email & Password based) ---
app.get('/admin-login', (req, res) => {
    res.send(`
        <body style="background:#050a14; color:white; text-align:center; padding-top:100px; font-family:Arial;">
            <div style="width:350px; margin:auto; background:#0b1120; padding:40px; border-radius:10px; border:1px solid #f39c12; box-shadow: 0 0 20px rgba(243, 156, 18, 0.2);">
                <h2 style="color:#f39c12; margin-bottom:20px;">Doctor / Admin Login</h2>
                <form action="/admin-portal" method="POST">
                    <input type="email" name="adminEmail" placeholder="Admin Email" required 
                           style="width:100%; padding:12px; margin-bottom:15px; border-radius:5px; border:1px solid #333; background:#16213e; color:white; box-sizing:border-box;">
                    <input type="password" name="adminKey" placeholder="Admin Password" required 
                           style="width:100%; padding:12px; margin-bottom:20px; border-radius:5px; border:1px solid #333; background:#16213e; color:white; box-sizing:border-box;">
                    <button type="submit" style="width:100%; background:#f39c12; border:none; padding:12px; color:white; font-weight:bold; border-radius:5px; cursor:pointer;">LOGIN</button>
                </form>
            </div>
        </body>
    `);
});

// --- 2. ADMIN DASHBOARD (Graphs, Search, Blinking, Call - ALL IN ONE) ---
app.get('/admin-login', (req, res) => {
    res.send(`
        <body style="background:#050a14; color:white; text-align:center; padding-top:100px; font-family:Arial;">
            <div id="loginBox" style="width:380px; margin:auto; background:#0b1120; padding:40px; border-radius:12px; border:1px solid #f39c12; box-shadow: 0 0 20px rgba(243, 156, 18, 0.2);">
                <h2 style="color:#f39c12; margin-bottom:25px;">Doctor / Admin Login</h2>
                
                <form action="/admin-portal" method="POST">
                    <input type="email" name="adminEmail" placeholder="Admin Email" required 
                           style="width:100%; padding:14px; margin-bottom:15px; border-radius:5px; border:1px solid #333; background:#16213e; color:white; box-sizing:border-box;">
                    
                    <input type="password" name="adminKey" placeholder="Password" required 
                           style="width:100%; padding:14px; margin-bottom:20px; border-radius:5px; border:1px solid #333; background:#16213e; color:white; box-sizing:border-box;">
                    
                    <button type="submit" style="width:100%; background:#f39c12; border:none; padding:14px; color:white; font-weight:bold; border-radius:5px; cursor:pointer;">
                        LOGIN TO PORTAL
                    </button>
                </form>

                <div style="margin-top:30px; border-top:1px solid #222; padding-top:20px;">
                    <p style="color:#666; font-size:0.8rem;">Emergency? Admin not available?</p>
                    <button onclick="showEmergency()" style="background:none; border:1px solid #ff4d4d; color:#ff4d4d; padding:8px 15px; border-radius:5px; cursor:pointer; font-size:0.75rem; font-weight:bold;">
                        USE MASTER RESET KEY
                    </button>
                </div>
            </div>

            <div id="emergencyBox" style="display:none; width:380px; margin:auto; background:#1a0a0a; padding:40px; border-radius:12px; border:2px dashed #ff4d4d;">
                <h2 style="color:#ff4d4d;">EMERGENCY BYPASS</h2>
                <p style="color:#aaa; font-size:0.85rem; margin-bottom:20px;">Enter the Secret Master Key from the hospital safe.</p>
                <form action="/admin-portal" method="POST">
                    <input type="hidden" name="adminEmail" value="MASTER-RECOVERY">
                    <input type="password" name="adminKey" placeholder="Enter Master Key" required 
                           style="width:100%; padding:14px; margin-bottom:20px; border-radius:5px; border:1px solid #ff4d4d; background:#000; color:white; box-sizing:border-box;">
                    <button type="submit" style="width:100%; background:#ff4d4d; border:none; padding:14px; color:white; font-weight:bold; border-radius:5px; cursor:pointer;">
                        UNLOCK SYSTEM NOW
                    </button>
                </form>
                <br>
                <button onclick="hideEmergency()" style="color:#888; background:none; border:none; cursor:pointer; text-decoration:underline;">Back to Normal Login</button>
            </div>

            <script>
                function showEmergency() {
                    document.getElementById('loginBox').style.display = 'none';
                    document.getElementById('emergencyBox').style.display = 'block';
                }
                function hideEmergency() {
                    document.getElementById('loginBox').style.display = 'block';
                    document.getElementById('emergencyBox').style.display = 'none';
                }
            </script>
        </body>
    `);
});
// --- ADMIN DASHBOARD (Graphs + Search + Blinking + Call) ---
app.post('/admin-portal', (req, res) => {
    const { adminEmail, adminKey } = req.body;

    // --- CONFIGURATION ---
    const MASTER_RECOVERY_KEY = "HOSPITAL-EMERGENCY-2025-RECOVER"; 
    const officialAdminEmail = "admin@hospital.com";
    const officialAdminPass = "admin123";

    // --- EMERGENCY & STANDARD ACCESS LOGIC ---
    const isMasterKeyUsed = (adminKey === MASTER_RECOVERY_KEY);
    const isStandardAdmin = (adminEmail === officialAdminEmail && adminKey === officialAdminPass);

    if (!isMasterKeyUsed && !isStandardAdmin) {
        return res.send(`
            <body style="background:#050a14; color:white; text-align:center; padding-top:100px; font-family:Arial;">
                <h2 style="color:#ff4d4d;">Access Denied!</h2>
                <p>Incorrect Credentials. For emergency access, use the Master Recovery Key.</p>
                <a href="http://10.193.80.225:3000/admin-login" style="color:#f39c12; text-decoration:none; font-weight:bold;">← Go Back to Login</a>
            </body>
        `);
    }

    // --- READ DATA ---
    let reports = [];
    try {
        reports = readData(REPORTS_DB);
    } catch (err) {
        reports = [];
    }

    // --- 1. DATA CALCULATIONS FOR GRAPHS ---
    const highRiskReports = reports.filter(r => r.result && r.result.includes('High'));
    const highRiskCount = highRiskReports.length;
    const lowRiskCount = reports.length - highRiskCount;

    const ageGroups = { '18-30': 0, '31-50': 0, '50+': 0 };
    reports.forEach(r => {
        const age = parseInt(r.age);
        if (age <= 30) ageGroups['18-30']++;
        else if (age <= 50) ageGroups['31-50']++;
        else ageGroups['50+']++;
    });

    const occMap = {};
    highRiskReports.forEach(r => {
        const job = r.occupation || 'Other';
        occMap[job] = (occMap[job] || 0) + 1;
    });
    const sortedOccs = Object.entries(occMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const occLabels = sortedOccs.map(x => x[0]);
    const occValues = sortedOccs.map(x => x[1]);

    // --- 2. TABLE ROWS GENERATION ---
    const sortedReports = [...reports].reverse();
    let tableRows = sortedReports.map(r => {
        const isHighRisk = r.result && r.result.includes("High");
        const phone = r.phone_number || r.phone || "Not Provided";

        return `
        <tr class="search-row" style="border-bottom: 1px solid #333; background: ${isHighRisk ? 'rgba(255, 77, 77, 0.05)' : 'transparent'};">
            <td style="padding:15px;">
                <div style="font-weight:bold; color:white;">${r.email}</div>
                <div style="color:#aaa; font-size:0.85rem; margin-top:5px;">📞 ${phone}</div>
            </td>
            <td style="padding:15px;">
                <span style="font-weight:bold; color:${isHighRisk ? '#ff4d4d' : '#2ecc71'};">${r.result}</span>
                ${isHighRisk ? '<div class="blink" style="margin-top:8px; background:#ff4d4d; color:white; padding:3px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold; width:fit-content;">🚨 URGENT ACTION</div>' : ''}
            </td>
            <td style="padding:15px;">
                <div style="display:flex; gap:10px;">
                    <a href="http://10.193.80.225:3000/view-report?id=${r.id}" target="_blank" style="background:#f39c12; color:white; padding:8px 12px; text-decoration:none; border-radius:5px; font-size:0.8rem; font-weight:bold;">REPORT</a>
                    ${(phone !== "Not Provided") ? `<a href="tel:${phone}" style="background:#2ecc71; color:white; padding:8px 12px; text-decoration:none; border-radius:5px; font-size:0.8rem; font-weight:bold;">CALL</a>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');

    res.send(`
        <body style="background:#050a14; color:white; font-family:Arial; padding:30px;">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                .blink { animation: blinker 1s linear infinite; }
                @keyframes blinker { 50% { opacity: 0; } }
                .card { background:#0b1120; padding:15px; border-radius:12px; border:1px solid #333; }
                .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px; }
            </style>

            <div style="max-width:1200px; margin:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2 style="color:#f39c12;">HOSPITAL ADMIN PORTAL</h2>
                    <a href="/admin-login" style="color:#ff4d4d; border:1px solid #ff4d4d; padding:5px 15px; text-decoration:none; border-radius:5px; font-size:0.8rem; font-weight:bold;">LOGOUT</a>
                </div>
                
                <div class="grid">
                    <div class="card"><canvas id="riskChart"></canvas></div>
                    <div class="card"><canvas id="ageChart"></canvas></div>
                    <div class="card"><canvas id="occChart"></canvas></div>
                </div>

                <div class="card">
                    <input type="text" id="adminSearch" onkeyup="searchTable()" placeholder="Search by Email or Diagnosis..." 
                           style="width:100%; padding:14px; margin-bottom:20px; border-radius:5px; background:#16213e; color:white; border:1px solid #444;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead style="text-align:left; color:#f39c12; background:#16213e;">
                            <tr><th style="padding:15px;">Patient</th><th style="padding:15px;">Status</th><th style="padding:15px;">Action</th></tr>
                        </thead>
                        <tbody id="adminTable">${tableRows}</tbody>
                    </table>
                </div>
            </div>

            <script>
                function searchTable() {
                    let filter = document.getElementById("adminSearch").value.toUpperCase();
                    let rows = document.getElementsByClassName("search-row");
                    for (let row of rows) {
                        row.style.display = row.innerText.toUpperCase().includes(filter) ? "" : "none";
                    }
                }

                new Chart(document.getElementById('riskChart'), {
                    type: 'doughnut',
                    data: { labels: ['High Risk', 'Healthy'], datasets: [{ data: [${highRiskCount}, ${lowRiskCount}], backgroundColor: ['#ff4d4d', '#2ecc71'] }] },
                    options: { plugins: { title: { display: true, text: 'Overall Risk Status', color: '#fff' } } }
                });

                new Chart(document.getElementById('ageChart'), {
                    type: 'bar',
                    data: { labels: ['18-30', '31-50', '50+'], datasets: [{ label: 'Patients', data: [${ageGroups['18-30']}, ${ageGroups['31-50']}, ${ageGroups['50+']}], backgroundColor: '#3498db' }] },
                    options: { plugins: { title: { display: true, text: 'Age Distribution', color: '#fff' } } }
                });

                new Chart(document.getElementById('occChart'), {
                    type: 'pie',
                    data: { labels: ${JSON.stringify(occLabels)}, datasets: [{ data: ${JSON.stringify(occValues)}, backgroundColor: ['#f39c12', '#9b59b6', '#e74c3c', '#1abc9c'] }] },
                    options: { plugins: { title: { display: true, text: 'Top 4 Occupations (High Risk)', color: '#fff' } } }
                });
            </script>
        </body>
    `);
});
const PORT = 3000;
const MY_IP = '10.193.80.225'; // Mee IPv4 address

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running!`);
    console.log(`💻 Laptop: http://localhost:${PORT}`);
    console.log(`📱 Mobile: http://${MY_IP}:${PORT}`);
});







