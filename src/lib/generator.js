const COLORS = [
    "#EF9A9A", "#64B5F6", "#81C784", "#FFF176", "#BA68C8",
    "#FFB74D", "#4DD0E1", "#AED581", "#FFAB91", "#BDBDBD",
    "#FFF59D", "#4DB6AC", "#F06292", "#FFD54F", "#388E3C",
    "#1976D2", "#FFA726", "#7E57C2", "#00ACC1", "#E57373"
];

function parseSchedule(scheduleStr) {
    if (!scheduleStr || !scheduleStr.trim()) return [];

    const schedules = [];
    const sessions = scheduleStr.split(';');

    sessions.forEach(session => {
        session = session.trim();
        if (!session) return;

        const parts = session.split(/[,:]/);
        if (parts.length < 2) return;

        const dayPart = parts[0].trim();
        const dayMatch = dayPart.match(/Thứ (\d+)/i);
        if (!dayMatch) return;
        const day = parseInt(dayMatch[1]);

        const periodPart = parts[1].trim();
        let startPeriod, endPeriod;
        
        const rangeMatch = periodPart.match(/(\d+)-(\d+)/);
        if (rangeMatch) {
            startPeriod = parseInt(rangeMatch[1]);
            endPeriod = parseInt(rangeMatch[2]);
        } else {
            const singleMatch = periodPart.match(/(\d+)/);
            if (singleMatch) {
                startPeriod = endPeriod = parseInt(singleMatch[1]);
            } else {
                return;
            }
        }

        const room = parts.length > 2 ? parts[2].trim() : "";

        schedules.push({ day, startPeriod, endPeriod, room });
    });

    return schedules;
}

function parseJsonData(jsonData) {
    let data = jsonData;
    if (typeof jsonData === 'string') {
        data = JSON.parse(jsonData);
    }

    const courses = {};
    
    let typeKeys;
    if (data.length > 0 && 'Column_7' in data[0] && 'Column_8' in data[0]) {
        typeKeys = ["Thông tin lớp học phần", "Khảo sát ý kiến cuối học kỳ" ,'Column_7', 'Column_8'];
    } else {
        typeKeys = ['Mã lớp học phần', 'Tên lớp học phần', 'Giảng viên', 'Thời khóa biểu'];
    }

    data.forEach(item => {
        if (typeof item["TT"] !== 'number') return;

        const courseCode = item[typeKeys[0]] || "";
        const courseName = item[typeKeys[1]] || "";
        const teacher = item[typeKeys[2]] || "";
        const scheduleStr = item[typeKeys[3]] || "";

        const scheduleList = parseSchedule(scheduleStr);
        if (scheduleList.length === 0) return;

        const courseIdBase = String(item["TT"]);

        scheduleList.forEach((sched, i) => {
            const courseId = i > 0 ? `${courseIdBase}_${i}` : courseIdBase;
            
            courses[courseId] = {
                courseCode,
                courseName,
                teacher,
                room: sched.room,
                schedule: sched,
                sessionIndex: i
            };
        });
    });

    return courses;
}

function drawTextWithMaxWidth(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && i > 0) {
            ctx.fillText(line, x + 20, currentY);
            line = words[i] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x + 20, currentY);
    return currentY + lineHeight;
}

async function generateScheduleImage(jsonData, bgImageUrl) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const bgImage = new Image();
    bgImage.src = bgImageUrl;
    
    await new Promise((resolve, reject) => {
        bgImage.onload = resolve;
        bgImage.onerror = reject;
    });

    canvas.width = bgImage.width;
    canvas.height = bgImage.height;

    ctx.drawImage(bgImage, 0, 0);

    ctx.font = "40px 'TableFont', 'Arial', sans-serif"; // 38-44px
    ctx.textBaseline = "top";

    const startX = 513;
    const startY = 385;
    const cellWidth = 384;
    const cellHeight = 128; 
    const maxWidth = 340;
    
    const parsedCourses = parseJsonData(jsonData);
    const colorList = [...COLORS];

    let colorIndex = 0;

    Object.values(parsedCourses).forEach(course => {
        const color = colorList[colorIndex % colorList.length];
        
        const day = course.schedule.day;
        const start = course.schedule.startPeriod;
        const end = course.schedule.endPeriod;
        const textHeight = ctx.measureText(course.courseName).actualBoundingBoxAscent + ctx.measureText(course.courseName).actualBoundingBoxDescent;

        const x = startX + (day - 2) * cellWidth;
        const y = startY + (start - 1) * cellHeight;

        const boxHeight = (end - start + 1) * cellHeight;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellWidth, boxHeight);
        
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, cellWidth, boxHeight);

        ctx.fillStyle = "black";

        let textY = y + 25;
        
        let subjectTextHeight = drawTextWithMaxWidth(ctx, course.courseName.trim(), x, textY, maxWidth, textHeight + 15);
             textY += 50 * Math.ceil(ctx.measureText(course.courseName).width / maxWidth);

        let roomTextHeight = drawTextWithMaxWidth(ctx, `- ${course.room.trim()}`, x, subjectTextHeight, maxWidth, textHeight + 15);
        if (false) // Always show teacher @theme
        {
            drawTextWithMaxWidth(ctx, `${course.teacher.trim()}`, x, roomTextHeight + 15, maxWidth, textHeight + 10);
        }

        colorIndex++;
    });

    return canvas.toDataURL("image/png");
}
