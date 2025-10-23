const TimeSession = require("../models/timeSession");
const UAParser = require('ua-parser-js')
const moment = require('moment-timezone');

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

