const WorkSession = require('../models/addHours')
const Worker = require('../models/worker')

exports.addhours = async (req, res) => {
    const { idNumber } = req.body;
    if (!idNumber) {
      return res.status(400).json({ message: 'ID number is required' });
    }
  
    try {
      const user = await Worker.findOne({ idNumber });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      req.session.userId = user._id;
      res.status(200).json({ message: 'Login successful' });
    } catch (err) {
      res.status(500).json({ message: 'Error logging in', error: err });
    }
}

exports.readsessions = async (req, res) => {
    console.log('session aqui get');
    
    try {
      const sessions = await WorkSession.find({ userId: req.session.userId });
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching sessions', error: err });
    }
}

exports.addsessions = async (req, res) => {
  console.log('session aqui post');
    const { startTime, endTime } = req.body;
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Both startTime and endTime are required' });
    }
  
    try {
      // Check if a session already exists for the user today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const existingSession = await WorkSession.findOne({
        userId: req.session.userId,
        startTime: { $gte: today },
      });
  
      if (existingSession) {
        return res.status(400).json({ message: 'Work session already logged for today' });
      }
  
      const session = new WorkSession({
        userId: req.session.userId,
        startTime,
        endTime,
      });
      await session.save();
      res.status(201).json(session);
    } catch (err) {
      res.status(500).json({ message: 'Error saving session', error: err });
    }
}