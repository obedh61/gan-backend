const User = require('../models/user')

exports.read = (req, res) => {
    const userId = req.params.id;
    User.findById(userId).exec()
        .then(user => {
            if (!user) {
                return res.status(400).json({
                    error: 'User not found'
                })
            }
            user.hashed_password = undefined
            user.salt = undefined
            res.json(user);
        })
        .catch(e => {
            console.error(e);
        })
}

exports.update = (req, res) => {
    // console.log(req.body, req.auth);
    const {name, password} = req.body

    User.findOne({_id: req.auth._id})
        .then(user => {
            if(!user) {
                return res.status(400).json({
                    error: 'User not found'
                })
            }
            if(!name) {
                return res.status(400).json({
                    error: 'Name is required'
                })
            } else {
                user.name = name
            }
            if(password) {
                if(password.length < 6) {
                    return res.status(400).json({
                        error: 'Password should be min 6 characters long'
                    })
                } else {
                    user.password = password
                }
            }

            user.save()
                .then(updateUser => {
                    updateUser.hashed_password = undefined
                    updateUser.salt = undefined
                    res.json(updateUser)
                })
                .catch(e => {
                    console.log('USER UPDATE ERROR', e);
                    return res.status(400).json({
                        error: 'User update failed'
                    })
                })
        });
}