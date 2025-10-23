const Worker = require('../models/worker')
const Child = require('../models/Child');

exports.addWorker = async (req, res) => {
    const { username, idNumber } = req.body;
    if (!username || !idNumber) {
      return res.status(400).json({ message: 'Username and ID number are required' });
    }
  
    try {
      const existingUser = await Worker.findOne({ idNumber });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this ID number already exists' });
      }
  
      const user = new Worker({ username, idNumber });
      await user.save();
      res.status(201).json(user);
    } catch (err) {
      res.status(500).json({ message: 'Error creating user', error: err });
    }
}

exports.addChild = async (req, res) => {
  const { firstName, lastName, childName, teudatZeut, phoneNumber, bank, bankAccount } = req.body;

  try {
    // Crear un nuevo niño
    const newChild = new Child({
      firstName,
      lastName,
      childName,
      teudatZeut,
      phoneNumber,
      bank,
      bankAccount
    });

    // Guardar en la base de datos
    await newChild.save();
    res.status(201).json({ message: 'Child added successfully' });
  } catch (error) {
    console.error('Error adding child:', error);
    res.status(500).json({ message: 'Error adding child' });
  }
};

exports.getChildren = async (req, res) => {
  try {
    const children = await Child.find();
    res.status(200).json(children);
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ message: 'Error fetching children' });
  }
};

exports.deleteChild = async (req, res) => {
  const { id } = req.params;

  try {
    await Child.findByIdAndDelete(id);
    res.status(200).json({ message: 'Child deleted successfully' });
  } catch (error) {
    console.error('Error deleting child:', error);
    res.status(500).json({ message: 'Error deleting child' });
  }
};

exports.getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find();
    res.status(200).json(workers);
  } catch (err) {
    console.error("Error fetching workers:", err);
    res.status(500).json({ message: "Failed to fetch workers." });
  }
}

exports.deleteWorker = async (req, res) => {
  const { idNumber } = req.params;

  try {
    const result = await Worker.findOneAndDelete({ idNumber });
    if (!result) {
      return res.status(404).json({ message: "Worker not found." });
    }
    res.status(200).json({ message: "Worker deleted successfully." });
  } catch (err) {
    console.error("Error deleting worker:", err);
    res.status(500).json({ message: "Failed to delete worker." });
  }
}