const mongoose = require('mongoose')
const TimeSession = require("../models/timeSession");
const Worker = require("../models/worker");
const UAParser = require('ua-parser-js')
const moment = require('moment-timezone');
const PDFDocument = require('pdfkit');

exports.timesession = async (req, res) => {
    try {
      const sessions = await TimeSession.find();
      res.status(200).send(sessions);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
}

exports.startTime = async (req, res) => {
    const { idNumber, startTime, userAgent, location } = req.body;
    // const userAgent = req.headers['useragent'];
    const parser = new UAParser();
    const deviceInfo = parser.setUA(userAgent).getResult();
    console.log(typeof location);
    
    try {
      const todayDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" });
      const today = new Date(todayDate);  // Convertimos el string a un objeto Date

      // Ahora, podemos ajustar la hora a las 00:00:00.000
      today.setHours(0, 0, 0, 0);
      console.log(today);
      
      const existingSession = await TimeSession.findOne({
        idNumber: idNumber,
        startTime: { $gte: today },
      });
  
      if (existingSession) {
        return res.status(400).json({ message: 'Work session already logged for today' });
      }
      // Verificar si hay una sesión activa
      const activeSession = await TimeSession.findOne({ idNumber, endTime: null });
      if (activeSession) {
        return res
          .status(400)
          .send({ message: 'You already have an active session. Please end it before starting a new one.' });
      }
  
      // Crear una nueva sesión
      const session = new TimeSession({ idNumber, startTime, userAgent, locationStart: location });
      await session.save();
      res.status(201).send(session);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
}

exports.endTime = async (req, res) => {
    const { idNumber, endTime, location } = req.body;
    console.log(endTime);
    
    try {
      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        return res.status(400).send({ message: 'Invalid location format' });
      }

      const session = await TimeSession.findOneAndUpdate(
        { idNumber, endTime: null },
        { endTime, locationEnd: location },
        { new: true }
      );
      if (!session) {
        return res.status(404).send({ message: 'No active session found' });
      }
      res.status(200).send(session);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
}

exports.startSession = async (req, res) => {
    // const { idNumber } = req.body;
    const idNumber = req.params.idNumber
    console.log(idNumber);
    
    try {
      const activeSession = await TimeSession.findOne({ idNumber, endTime: null });
      console.log(activeSession);
      
      if (activeSession) {
        res.status(200).send(activeSession);
      } else {
        res.status(204).send(activeSession); // No hay sesión activa
      }
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
}

exports.worksession = async (req, res) => {
  const { idNumber, year, month } = req.params;

  try {
    const sessions = await TimeSession.find({
      idNumber,
      startTime: {
        $gte: new Date(year, month - 1, 1), // Start of the month
        $lt: new Date(year, month, 1), // End of the month
      },
    });

    const sessionsWithTotalHours = sessions.map(session => {
      // Convertir a hora de Israel usando moment-timezone
      const startTime = moment(session.startTime).tz('Asia/Jerusalem');
      const endTime = session.endTime ? moment(session.endTime).tz('Asia/Jerusalem') : moment();
      
      // Calcular la duración en milisegundos
      const durationMs = endTime.diff(startTime);
      const totalHours = Math.floor(durationMs / (1000 * 60 * 60)); // Horas
      const totalMinutes = Math.ceil((durationMs % (1000 * 60 * 60)) / (1000 * 60)); // Redondeo de minutos

      return {
        day: startTime.date(),
        month: startTime.month() + 1,
        year: startTime.year(),
        timeIn: startTime.format('HH:mm'),
        timeOut: endTime.format('HH:mm'),
        totalHours: `${totalHours}h ${totalMinutes}m`,
      };
    });

    console.log(sessionsWithTotalHours);
    
    res.status(200).json(sessionsWithTotalHours);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
};

exports.fetchSessions = async (req, res) => {
  const { idNumber, year, month } = req.params;
  try {
    const sessions = await TimeSession.find({
      idNumber,
      startTime: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      },
    });

    const formattedSessions = sessions.map(session => {
      // Convertir a hora de Israel usando moment-timezone
      const startTime = moment(session.startTime).tz('Asia/Jerusalem', true);
      const endTime = session.endTime ? moment(session.endTime).tz('Asia/Jerusalem', true) : moment();
      
      // Calcular la duración en milisegundos
      const durationMs = endTime.diff(startTime);
      const totalHours = Math.floor(durationMs / (1000 * 60 * 60)); // Horas
      const totalMinutes = Math.ceil((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      return{
        _id: session._id,
        day: startTime.date(),
        month: startTime.month() + 1,
        year: startTime.year(),
        timeIn: startTime.format('HH:mm'),
        timeOut: endTime.format('HH:mm'),
        totalHours: `${totalHours}h ${totalMinutes}m`,
        locationStart: session.locationStart,
        locationEnd: session.locationEnd,
        userAgent: session.userAgent,
      }
      
    });

    console.log(formattedSessions);
    
    res.status(200).json(formattedSessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching sessions" });
  }
};

exports.updateSession = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid session ID' });
  }
  const { timeIn, timeOut, day, month, year } = req.body;

  try {
    const startTime = moment.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${timeIn}`, 'YYYY-MM-DD HH:mm', 'Asia/Jerusalem').toDate();
    const endTime = moment.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${timeOut}`, 'YYYY-MM-DD HH:mm', 'Asia/Jerusalem').toDate();

    if (endTime <= startTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const session = await TimeSession.findByIdAndUpdate(
      id,
      { startTime, endTime },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.status(200).json(session);
  } catch (err) {
    console.error('Error updating session:', err);
    res.status(500).json({ message: 'Failed to update session' });
  }
};

// Helper to escape semicolon-separated values
const escapeCsv = (value) => {
  const str = value == null ? '' : String(value)
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

exports.exportSessions = async (req, res) => {
  const { idNumber, year, month } = req.params;

  try {
    const worker = await Worker.findOne({ idNumber }).select('username').exec();
    const workerName = worker ? worker.username : 'Unknown';

    const sessions = await TimeSession.find({
      idNumber,
      startTime: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      },
    }).sort({ startTime: 1 });

    let totalMinutes = 0;

    const rows = sessions.map(session => {
      const startTime = moment(session.startTime).tz('Asia/Jerusalem', true);
      const endTime = session.endTime ? moment(session.endTime).tz('Asia/Jerusalem', true) : moment();
      const durationMs = endTime.diff(startTime);
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.ceil((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      totalMinutes += hours * 60 + minutes;

      return [
        startTime.date(),
        startTime.month() + 1,
        startTime.year(),
        startTime.format('HH:mm'),
        session.endTime ? endTime.format('HH:mm') : 'Ongoing',
        `${hours}h ${minutes}m`,
      ];
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    const uniqueDays = new Set(sessions.map(session => {
      const startTime = moment(session.startTime).tz('Asia/Jerusalem', true);
      return `${startTime.date()}-${startTime.month() + 1}-${startTime.year()}`;
    })).size;

    const headers = ['Day', 'Month', 'Year', 'Time In', 'Time Out', 'Total Hours'];
    const csvLines = [
      'sep=;',
      `Worker Name;${workerName}`,
      `ID Number;${idNumber}`,
      `Month/Year;${month}/${year}`,
      '',
      headers.join(';'),
      ...rows.map(row => row.map(escapeCsv).join(';')),
      '',
      `Total Days;;;;;${uniqueDays}`,
      `Total Hours;;;;;${totalHours}h ${remainingMinutes}m`
    ];
    const csv = '\uFEFF' + csvLines.join('\n');

    const filename = `sessions_${idNumber}_${year}_${month}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Error exporting sessions:', err);
    res.status(500).json({ message: 'Failed to export sessions' });
  }
};

exports.exportSessionsPDF = async (req, res) => {
  const { idNumber, year, month } = req.params;

  try {
    const worker = await Worker.findOne({ idNumber }).select('username').exec();
    const workerName = worker ? worker.username : 'Unknown';

    const sessions = await TimeSession.find({
      idNumber,
      startTime: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      },
    }).sort({ startTime: 1 });

    let totalMinutes = 0;
    const rows = sessions.map(session => {
      const startTime = moment(session.startTime).tz('Asia/Jerusalem', true);
      const endTime = session.endTime ? moment(session.endTime).tz('Asia/Jerusalem', true) : moment();
      const durationMs = endTime.diff(startTime);
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.ceil((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      totalMinutes += hours * 60 + minutes;

      return {
        day: startTime.date(),
        month: startTime.month() + 1,
        year: startTime.year(),
        timeIn: startTime.format('HH:mm'),
        timeOut: session.endTime ? endTime.format('HH:mm') : 'Ongoing',
        total: `${hours}h ${minutes}m`
      };
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const uniqueDays = new Set(sessions.map(session => {
      const startTime = moment(session.startTime).tz('Asia/Jerusalem', true);
      return `${startTime.date()}-${startTime.month() + 1}-${startTime.year()}`;
    })).size;

    const doc = new PDFDocument({ margin: 40 });
    const filename = `sessions_${idNumber}_${year}_${month}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Title
    doc.fontSize(18).text('Work Sessions Report', 40, 40);
    doc.fontSize(12).text(`Worker: ${workerName}`, 40, 65);
    doc.fontSize(12).text(`ID Number: ${idNumber} | Month: ${month}/${year}`, 40, 80);
    doc.moveDown(2);

    // Table headers
    const colX = [40, 90, 150, 210, 280, 360];
    const rowY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Day', colX[0], rowY);
    doc.text('Month', colX[1], rowY);
    doc.text('Year', colX[2], rowY);
    doc.text('Time In', colX[3], rowY);
    doc.text('Time Out', colX[4], rowY);
    doc.text('Total Hours', colX[5], rowY);
    doc.moveDown(0.8);

    // Separator line
    doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);

    // Table rows
    doc.font('Helvetica');
    rows.forEach(row => {
      const y = doc.y;
      doc.text(String(row.day), colX[0], y);
      doc.text(String(row.month), colX[1], y);
      doc.text(String(row.year), colX[2], y);
      doc.text(row.timeIn, colX[3], y);
      doc.text(row.timeOut, colX[4], y);
      doc.text(row.total, colX[5], y);
      doc.moveDown(0.6);

      if (doc.y > 700) {
        doc.addPage();
      }
    });

    // Totals
    doc.moveDown(1);
    doc.font('Helvetica-Bold');
    doc.text(`Total Days: ${uniqueDays}`, 40, doc.y);
    doc.text(`Total Hours: ${totalHours}h ${remainingMinutes}m`, 40, doc.y + 15);

    doc.end();
  } catch (err) {
    console.error('Error exporting sessions PDF:', err);
    res.status(500).json({ message: 'Failed to export sessions PDF' });
  }
};

