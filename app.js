let isEditingMode = false;
let isAppFullscreen = false;

let appData = {
    users: [], 
    exam: { type: 'מבחן', subject: 'מתמטיקה', date: null, daysLeft: 0 },
    settings: { mode: 'smart', fixedStudy: 45, fixedBreak: 10, voiceEnabled: true, globalMute: false },
    state: { currentMode: 'study', timeLeft: 0, initialTime: 0, timerId: null, quoteId: null, totalStudy: 0, totalBreak: 0, sessionCount: 0, startTimeStr: '' }
};

function toggleUnitsVisibility() {
    const subj = document.getElementById('examSubject').value;
    const unitBlocks = document.querySelectorAll('.unit-block');
    if (subj === 'מתמטיקה' || subj === 'אנגלית') {
        unitBlocks.forEach(b => b.style.display = 'flex');
    } else {
        unitBlocks.forEach(b => b.style.display = 'none');
    }
}

function toggleDateVisibility() {
    const type = document.getElementById('examType').value;
    if (type === 'למידה שוטפת') {
        document.getElementById('dateBlock').style.display = 'none';
    } else {
        document.getElementById('dateBlock').style.display = 'flex';
    }
}

window.onload = () => {
    toggleUnitsVisibility();
    toggleDateVisibility();
};

function removeUserRow(btn) {
    btn.parentElement.remove();
}

function addUserRow() {
    const container = document.getElementById('usersContainer');
    const row = document.createElement('div');
    row.className = 'user-row';
    row.innerHTML = `
        <div class="input-block">
            <label>איך קוראים לך?</label>
            <input type="text" class="u-name">
        </div>
        <div class="input-block">
            <label>מין למשפטי מוטיבציה?</label>
            <select class="u-gender">
                <option value="F">נקבה</option>
                <option value="M">זכר</option>
            </select>
        </div>
        <div class="input-block unit-block" style="${document.getElementById('examSubject').value === 'מתמטיקה' || document.getElementById('examSubject').value === 'אנגלית' ? 'flex' : 'none'}">
            <label>כמה יח"ל?</label>
            <select class="u-units">
                <option value="3">3 יח"ל</option>
                <option value="4">4 יח"ל</option>
                <option value="5">5 יח"ל</option>
            </select>
        </div>
        <div class="input-block">
            <label>מה נותן לך מוטיבציה?</label>
            <input type="text" class="u-motive" value="להצליח בגדול">
        </div>
        <button onclick="removeUserRow(this)" style="position:absolute; top:-10px; left:-10px; background:#ff4d4d; color:white; border:none; border-radius:50%; width:25px; height:25px; cursor:pointer; font-weight:bold;">X</button>
    `;
    container.appendChild(row);
}

function toggleManualTime() {
    const val = document.getElementById('timeMode').value;
    if (val === 'fixed') {
        document.getElementById('manualTimeInputs').style.display = 'block';
    } else {
        document.getElementById('manualTimeInputs').style.display = 'none';
    }
}

function initApp() {
    const rows = document.querySelectorAll('.user-row');
    let tempUsers = [];
    rows.forEach(row => {
        const name = row.querySelector('.u-name').value.trim();
        if (name) {
            tempUsers.push({
                name: name, 
                gender: row.querySelector('.u-gender').value,
                units: row.querySelector('.u-units').value, 
                motive: row.querySelector('.u-motive').value.trim()
            });
        }
    });

    if (tempUsers.length === 0) { 
        alert('חייבים לפחות לומד אחד בשביל להתחיל!'); 
        return; 
    }
    
    const examType = document.getElementById('examType').value;
    const examDateInput = document.getElementById('examDate').value;

    if (examType !== 'למידה שוטפת' && !examDateInput && !isEditingMode) { 
        alert('בבקשה לבחור תאריך למבחן! (או לשנות ללמידה שוטפת)'); 
        return; 
    }

    appData.users = tempUsers;
    appData.exam.subject = document.getElementById('examSubject').value;
    appData.exam.type = examType;
    
    if (examType !== 'למידה שוטפת' && examDateInput) {
        appData.exam.date = new Date(examDateInput);
        const today = new Date();
        appData.exam.daysLeft = Math.ceil((appData.exam.date - today) / (1000 * 60 * 60 * 24));
    } else {
        appData.exam.daysLeft = 0;
    }

    appData.settings.mode = document.getElementById('timeMode').value;
    appData.settings.fixedStudy = parseInt(document.getElementById('setupStudyTime').value);
    appData.settings.fixedBreak = parseInt(document.getElementById('setupBreakTime').value);
    appData.settings.voiceEnabled = document.getElementById('enableVoice').checked;

    if (!isEditingMode) {
        appData.state.startTimeStr = new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
    }

    buildDynamicUI();
    updateModeUI();

    if (appData.settings.mode === 'flexible') {
        document.getElementById('flexibleTimeGroup').style.display = 'block';
    } else {
        document.getElementById('flexibleTimeGroup').style.display = 'none';
    }

    if (!isEditingMode) {
        setSessionTimes(false); 
    } else {
        setSessionTimes(true); 
        if (appData.state.timerId !== null) {
           document.getElementById('motivationText').innerText = generateQuote(appData.state.currentMode === 'study' ? 'study_text' : 'break_text');
        }
    }
    
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    
    if (appData.settings.voiceEnabled && !appData.settings.globalMute && !isEditingMode) {
        let dummy = new SpeechSynthesisUtterance("");
        window.speechSynthesis.speak(dummy);
    }
    isEditingMode = false;
}

function editSettings() {
    isEditingMode = true;
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('setupScreen').style.display = 'block';
    document.getElementById('startMainBtn').innerText = 'שמור שינויים והמשך ללמוד ✏️';
}

function resetAllStats() {
    if (!confirm("אתם בטוחים שאתם רוצים לאפס את סשן הלמידה הנוכחי?")) return;
    pauseTimer();
    appData.state.totalStudy = 0;
    appData.state.totalBreak = 0;
    appData.state.sessionCount = 0;
    appData.state.startTimeStr = new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
    document.querySelector('#historyTable tbody').innerHTML = '';
    updateGlobalClocks();
    appData.state.currentMode = 'study';
    updateModeUI();
    setSessionTimes(false);
}

function toggleFullscreen() {
    const timerPanel = document.querySelector('.timer-panel');
    const musicPanel = document.querySelector('.music-panel');
    const statsPanel = document.querySelector('.stats-panel');
    const btn = document.getElementById('fullscreenBtn');
    
    isAppFullscreen = !isAppFullscreen;
    
    if (isAppFullscreen) {
        musicPanel.style.display = 'none';
        statsPanel.style.display = 'none';
        
        timerPanel.style.flex = 'none';
        timerPanel.style.width = '100%';
        timerPanel.style.maxWidth = '1200px';
        btn.innerText = '✖';
        btn.title = "הקטן חזרה";
    } else {
        musicPanel.style.display = 'flex';
        statsPanel.style.display = 'flex';
        
        timerPanel.style.flex = '2';
        timerPanel.style.width = 'auto';
        timerPanel.style.maxWidth = 'none';
        btn.innerText = '⛶';
        btn.title = "הגדל למסך מלא";
    }
}

function buildDynamicUI() {
    const tr = document.createElement('tr');
    tr.innerHTML = '<th>סשן</th>';
    appData.users.forEach(u => {
        tr.innerHTML += `<th>${u.name}<br><span style="font-size:0.8em; font-weight:normal;">(חומר / הרגשה)</span></th>`;
    });
    document.getElementById('historyHead').innerHTML = '';
    document.getElementById('historyHead').appendChild(tr);

    const surveyCont = document.getElementById('surveyFormsContainer');
    surveyCont.innerHTML = '';
    appData.users.forEach((u, i) => {
        surveyCont.innerHTML += `
            <div style="background:#f3f4f6; padding:15px; border-radius:10px; margin-bottom:10px; text-align: right; border-right: 4px solid #d500f9;">
                <strong style="color:#4a148c; font-size:1.2em;">${u.name}</strong>
                <div class="survey-grid">
                    <div class="input-block">
                        <label>איך הולך עם החומר?</label>
                        <select id="prog_${i}">
                            <option value="💡 מעולה">💡 הבנתי מעולה</option>
                            <option value="👍 סבבה">👍 התקדמתי סבבה</option>
                            <option value="🤔 לתרגל">🤔 צריך תרגול</option>
                            <option value="🤯 קשה">🤯 לא הבנתי כלום</option>
                        </select>
                    </div>
                    <div class="input-block">
                        <label>איך ההרגשה עכשיו?</label>
                        <select id="mood_${i}">
                            <option value="😎 באנרגיות">😎 באנרגיות שיא</option>
                            <option value="🙂 הכל טוב">🙂 הכל טוב</option>
                            <option value="🥱 עייפות">🥱 קצת עייפות</option>
                            <option value="😫 שביזות">😫 שבוז/ה לגמרי</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    });
}

function setSessionTimes(keepRunning = false, manualMinutes = null) {
    if (keepRunning && appData.state.timerId !== null && appData.settings.mode !== 'flexible') {
        return; 
    }
    
    let mins = 25;
    if (manualMinutes !== null) {
        mins = manualMinutes;
        if (appData.settings.mode === 'flexible') {
            document.getElementById('flexMinutes').value = mins;
        }
    } else if (appData.settings.mode === 'smart') {
        if (appData.exam.type === 'למידה שוטפת') {
            mins = (appData.state.currentMode === 'study') ? 25 : 5; 
        } else {
            if (appData.state.currentMode === 'study') {
                mins = (appData.exam.daysLeft <= 3) ? 50 : (appData.exam.daysLeft <= 7) ? 40 : 25;
            } else {
                mins = (appData.exam.daysLeft <= 3) ? 10 : (appData.exam.daysLeft <= 7) ? 10 : 5;
            }
        }
    } else if (appData.settings.mode === 'fixed') {
        mins = (appData.state.currentMode === 'study') ? appData.settings.fixedStudy : appData.settings.fixedBreak;
    } else if (appData.settings.mode === 'flexible') {
        mins = parseInt(document.getElementById('flexMinutes').value) || 25;
    }

    appData.state.initialTime = mins * 60;
    if (!keepRunning || appData.state.timerId === null) {
        appData.state.timeLeft = appData.state.initialTime;
        updateDisplay();
        
        document.getElementById('flexMinutes').disabled = false;
    }
}

function updateTimerFromInput() {
    if (appData.state.timerId !== null) return;
    
    let inputVal = parseInt(document.getElementById('flexMinutes').value);
    if (isNaN(inputVal) || inputVal < 1) return;
    
    appData.state.initialTime = inputVal * 60;
    appData.state.timeLeft = appData.state.initialTime;
    updateDisplay();
}

function formatQuote(template, user) {
    let examText = appData.exam.type === 'למידה שוטפת' ? '' : `לקראת ה${appData.exam.type}`;
    let formattedStr = template.replace(/\{F:(.*?)\|M:(.*?)\}/g, function(match, p1, p2) {
        return user.gender === 'F' ? p1 : p2;
    });

    return formattedStr
        .replace(/{name}/g, user.name)
        .replace(/{units}/g, user.units)
        .replace(/{motive}/g, user.motive || 'המטרה')
        .replace(/{exam}/g, examText)
        .replace(/{subject}/g, appData.exam.subject);
}

function generateQuote(type) {
    const user = appData.users[Math.floor(Math.random() * appData.users.length)];
    let arrayToUse = [];

    if (type === 'study_text') {
        arrayToUse = quotesDB[appData.exam.subject]?.study || quotesDB['כללי'].study;
    } else if (type === 'break_text') {
        arrayToUse = extendedQuotesBreak;
    } else if (type === 'study_voice') {
        arrayToUse = quotesDB[appData.exam.subject]?.voice || quotesDB['כללי'].voice;
    } else if (type === 'break_voice') {
        arrayToUse = extendedSpokenBreak;
    }

    if (arrayToUse.length > 0) {
        const randomTemplate = arrayToUse[Math.floor(Math.random() * arrayToUse.length)];
        return formatQuote(randomTemplate, user);
    }
    return "כל הכבוד, תמשיכו ככה!";
}

function playAudio(url, btnElement) {
    document.querySelectorAll('.music-btn').forEach(b => b.classList.remove('playing'));
    const player = document.getElementById('bgMusicPlayer');
    
    if (url === 'stop') {
        player.pause();
        player.currentTime = 0;
        return;
    }
    
    btnElement.classList.add('playing');
    player.src = url;
    player.load(); 
    player.volume = 0.3; 
    
    if (!appData.settings.globalMute) {
        let playPromise = player.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log("Audio play prevented by browser, waiting for user click.", e);
            });
        }
    }
}

function toggleGlobalMute() {
    const btn = document.getElementById('muteBtn');
    const player = document.getElementById('bgMusicPlayer');
    appData.settings.globalMute = !appData.settings.globalMute;
    
    if (appData.settings.globalMute) {
        btn.innerText = "🔇 מערכת מושתקת"; 
        btn.classList.add('muted');
        player.pause();
        window.speechSynthesis.cancel();
    } else {
        btn.innerText = "🔊 השתק הכל (כולל דיבור)"; 
        btn.classList.remove('muted');
        if (player.src && player.src !== window.location.href) {
            player.play().catch(e => console.log(e));
        }
    }
}

// ==== התיקון של הדברן: נוספה שורת window.speechSynthesis.cancel() ====
function speakText(text) {
    if (appData.settings.globalMute || !appData.settings.voiceEnabled) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // משתיק כל דיבור קודם כדי למנוע את ה"שיגעון"
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'he-IL'; 
        
        utterance.pitch = 0.8;  
        utterance.rate = 0.85;  
        utterance.volume = 0.8; 
        
        window.speechSynthesis.speak(utterance);
    }
}

function updateDisplay() {
    const m = Math.floor(appData.state.timeLeft / 60);
    const s = appData.state.timeLeft % 60;
    document.getElementById('display').textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function formatTimeSpan(sec) {
    const h = Math.floor(sec/3600);
    const m = Math.floor((sec%3600)/60);
    const s = sec%60;
    return h>0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function updateGlobalClocks() {
    document.getElementById('totalStudyDisplay').innerText = formatTimeSpan(appData.state.totalStudy);
    document.getElementById('totalBreakDisplay').innerText = formatTimeSpan(appData.state.totalBreak);
}

function startTimer() {
    if (appData.state.timeLeft <= 0) setSessionTimes();
    if (appData.state.timerId !== null) return;

    document.getElementById('flexMinutes').disabled = true;

    document.getElementById('startBtn').innerText = 'ממשיכים...';
    document.getElementById('motivationText').innerText = generateQuote(appData.state.currentMode === 'study' ? 'study_text' : 'break_text');

    appData.state.quoteId = setInterval(() => {
        document.getElementById('motivationText').innerText = generateQuote(appData.state.currentMode === 'study' ? 'study_text' : 'break_text');
    }, 90000);

    appData.state.timerId = setInterval(() => {
        if (appData.state.currentMode === 'study') {
            appData.state.totalStudy++;
        } else {
            appData.state.totalBreak++;
        }
        
        updateGlobalClocks();
        appData.state.timeLeft--;
        updateDisplay();

        const timePassed = appData.state.initialTime - appData.state.timeLeft;

        if (appData.state.timeLeft > 0 && timePassed > 0 && timePassed % 180 === 0) {
            speakText(generateQuote(appData.state.currentMode === 'study' ? 'study_voice' : 'break_voice'));
        }

        if (appData.state.timeLeft <= 0) {
            clearInterval(appData.state.timerId);
            clearInterval(appData.state.quoteId);
            appData.state.timerId = null;
            document.getElementById('startBtn').innerText = 'התחלה ▶';
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }});

            if (appData.state.currentMode === 'study') {
                speakText("עבודה מדהימה. הסתיים פרק הלמידה. תמלאו איך היה ונצא להפסקה מנוחה.");
                
                if (appData.settings.mode === 'flexible') {
                    document.getElementById('flexBreakTimeGroup').style.display = 'block';
                } else {
                    document.getElementById('flexBreakTimeGroup').style.display = 'none';
                }
                
                setTimeout(() => document.getElementById('surveyModal').style.display = 'flex', 1500);
            } else {
                if (appData.settings.mode === 'flexible') {
                    speakText(`זמן ההפסקה הסתיים. כמה דקות תרצו ללמוד עכשיו?`);
                    document.getElementById('flexStudyModal').style.display = 'flex';
                } else {
                    speakText(`זמן ההפסקה הסתיים. חוזרים ללמוד ${appData.exam.subject}. בהצלחה.`);
                    appData.state.currentMode = 'study';
                    updateModeUI();
                    setSessionTimes(false);
                    startTimer(); 
                }
            }
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(appData.state.timerId);
    clearInterval(appData.state.quoteId);
    appData.state.timerId = null;
    document.getElementById('startBtn').innerText = 'המשך ▶';
}

function resetTimer() {
    pauseTimer();
    appData.state.timeLeft = appData.state.initialTime;
    updateDisplay();
    document.getElementById('startBtn').innerText = 'התחלה ▶';
    document.getElementById('flexMinutes').disabled = false;
}

function forceBreak() {
    pauseTimer();
    appData.state.currentMode = 'break';
    updateModeUI();
    setSessionTimes(false);
    speakText("הפסקה יזומה הופעלה. קחו זמן למנוחה ורגיעה.");
    startTimer(); 
}

function endBreakEarly() {
    pauseTimer();
    if (appData.settings.mode === 'flexible') {
        speakText(`ההפסקה הסתיימה מוקדם. כמה דקות תרצו ללמוד עכשיו?`);
        document.getElementById('flexStudyModal').style.display = 'flex';
    } else {
        speakText(`ההפסקה הסתיימה מוקדם. חוזרים ללמוד ${appData.exam.subject}. בהצלחה.`);
        appData.state.currentMode = 'study';
        updateModeUI();
        setSessionTimes(false);
        startTimer(); 
    }
}

function updateModeUI() {
    const ind = document.getElementById('modeIndicator');
    const forceBreakBtn = document.querySelector('.btn-force-break'); 

    if (appData.state.currentMode === 'study') {
        document.body.classList.remove('break-mode');
        ind.innerText = `📚 זמן למידה (${appData.exam.subject})`;
        ind.style.color = '#ff4081';
        
        if (forceBreakBtn) {
            forceBreakBtn.innerText = 'קחו הפסקה עכשיו ☕';
            forceBreakBtn.onclick = forceBreak;
            forceBreakBtn.style.background = 'linear-gradient(45deg, #8e2de2, #4a00e0)';
        }
    } else {
        document.body.classList.add('break-mode');
        ind.innerText = '☕ זמן הפסקה';
        ind.style.color = '#4a148c';
        
        if (forceBreakBtn) {
            forceBreakBtn.innerText = 'סיים הפסקה מוקדם 📚';
            forceBreakBtn.onclick = endBreakEarly;
            forceBreakBtn.style.background = 'linear-gradient(45deg, #4facfe, #00f2fe)';
        }
    }
}

function saveSurvey() {
    appData.state.sessionCount++;
    const tbody = document.querySelector('#historyTable tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>#${appData.state.sessionCount}</td>`;
    
    appData.users.forEach((u, i) => {
        const prog = document.getElementById(`prog_${i}`).value.split(' ')[0];
        const mood = document.getElementById(`mood_${i}`).value.split(' ')[0];
        tr.innerHTML += `<td>${prog} / ${mood}</td>`;
    });
    
    tbody.appendChild(tr);
    tr.style.backgroundColor = "rgba(74, 222, 128, 0.3)";
    setTimeout(() => tr.style.backgroundColor = "", 1500);

    document.getElementById('surveyModal').style.display = 'none';

    let nextBreakTime = null;
    if (appData.settings.mode === 'flexible') {
        nextBreakTime = parseInt(document.getElementById('flexBreakInput').value) || 10;
    }

    appData.state.currentMode = 'break';
    updateModeUI();
    setSessionTimes(false, nextBreakTime);
    speakText("שמרתי את ההתקדמות בטבלה. תהנו מההפסקה שלכם.");
    startTimer(); 
}

function startNextFlexStudy() {
    const studyMins = parseInt(document.getElementById('flexStudyInput').value) || 25;
    document.getElementById('flexStudyModal').style.display = 'none';

    appData.state.currentMode = 'study';
    updateModeUI();
    setSessionTimes(false, studyMins);
    speakText(`חוזרים ללמוד ${appData.exam.subject}. בהצלחה רבה.`);
    startTimer(); 
}

function saveSessionToHistory() {
    if (appData.state.totalStudy === 0) return; 
    
    const todayStr = new Date().toLocaleDateString('he-IL');
    const newSession = {
        date: todayStr,
        subject: appData.exam.subject,
        studyTime: formatTimeSpan(appData.state.totalStudy),
        breakTime: formatTimeSpan(appData.state.totalBreak),
        sessionsCount: appData.state.sessionCount
    };

    let history = JSON.parse(localStorage.getItem('studyAppHistory') || '[]');
    history.unshift(newSession); 
    localStorage.setItem('studyAppHistory', JSON.stringify(history));
}

function showHistoryModal() {
    const listContainer = document.getElementById('pastSessionsList');
    let history = JSON.parse(localStorage.getItem('studyAppHistory') || '[]');
    
    if (history.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#777;">עדיין לא נשמרו למידות. התחילו ללמוד כדי לראות את ההתקדמות שלכם כאן! ✨</p>';
    } else {
        let html = '';
        history.forEach((sess) => {
            html += `
                <div class="history-item">
                    <strong style="color: #4facfe;">${sess.date} - ${sess.subject}</strong><br>
                    ⏱️ זמן למידה: <b>${sess.studyTime}</b> | ☕ זמן הפסקה: <b>${sess.breakTime}</b> | ✅ סשנים: <b>${sess.sessionsCount}</b>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    }
    
    document.getElementById('historyModal').style.display = 'flex';
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

function clearAllHistory() {
    if (confirm("בטוחים שאתם רוצים למחוק את כל היסטוריית הלמידות שלכם? הנתונים לא יחזרו.")) {
        localStorage.removeItem('studyAppHistory');
        showHistoryModal();
    }
}

function finishStudying() {
    pauseTimer();
    const player = document.getElementById('bgMusicPlayer');
    if (player) player.pause();
    
    saveSessionToHistory();

    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('summaryScreen').style.display = 'block';
    
    let examStr = appData.exam.type === 'למידה שוטפת' ? '(למידה שוטפת)' : `לקראת ה${appData.exam.type}`;
    document.getElementById('sumExamType').innerText = examStr;
    document.getElementById('sumSubject').innerText = appData.exam.subject;
    document.getElementById('sumStudyTime').innerText = formatTimeSpan(appData.state.totalStudy);
    document.getElementById('sumBreakTime').innerText = formatTimeSpan(appData.state.totalBreak);
    document.getElementById('sumSessions').innerText = appData.state.sessionCount;
    
    const endTimeStr = new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
    document.getElementById('sumStartTime').innerText = appData.state.startTimeStr;
    document.getElementById('sumEndTime').innerText = endTimeStr;

    let totalMins = Math.floor(appData.state.totalStudy / 60);
    let namesStr = appData.users.map(u => u.name).join(' ו-');
    let adviceHTML = "";

    let ratio = appData.state.totalBreak > 0 ? (appData.state.totalStudy / appData.state.totalBreak) : 999;

    if (totalMins < 30) {
        adviceHTML = `<strong>סשן קצר וקולע, ${namesStr}! ⚡</strong><br>
        עשיתם ${totalMins} דקות של למידה נטו. `;
    } else if (totalMins < 90) {
        adviceHTML = `<strong>עבודה מעולה, ${namesStr}! 🌟</strong><br>
        חרשתם ${totalMins} דקות נטו! `;
    } else {
        adviceHTML = `<strong>וואו, חרישה מטורפת של אלופים! 🏆</strong><br>
        ${totalMins} דקות נטו של למידה! `;
    }

    if (totalMins > 0) {
        if (ratio > 10) {
            adviceHTML += "<br><br>⚠️ <strong>וואו, חרישה בלי רחמים:</strong> כמעט ולא לקחתם הפסקות! זה הספק מטורף, אבל בפעם הבאה כדאי לנוח קצת יותר כדי שהחומר ייספג טוב יותר במוח.";
        } else if (ratio >= 3) {
            adviceHTML += "<br><br>✅ <strong>איזון מושלם:</strong> שמרתם על יחס מעולה בין למידה אינטנסיבית למנוחה. זו הדרך הכי טובה ללמוד למבחנים!";
        } else if (ratio >= 1.5) {
            adviceHTML += "<br><br>💡 <strong>למידה רגועה:</strong> שילבתם הרבה מנוחה. זה מצוין לשמירה על שפיות וריכוז לאורך זמן.";
        } else {
            adviceHTML += "<br><br>☕ <strong>יום של התאוששות:</strong> היום נחתם כמעט כמו שלמדתם (או אפילו יותר). לפעמים המוח צריך את זה כדי להיטען מחדש. לא נורא, מחר נחזור בכל הכוח!";
        }
    }
    
    document.getElementById('sumAdvice').innerHTML = adviceHTML;
    speakText("סיכום הלמידה הושלם. מגיע לכם לנוח עכשיו ברוגע.");
    
    const end = Date.now() + 4000;
    (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ff9a9e', '#a1c4fd', '#fbc2eb', '#4facfe'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ff9a9e', '#a1c4fd', '#fbc2eb', '#4facfe'] });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}
