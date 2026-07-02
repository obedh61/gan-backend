const mongoose = require('mongoose')
const User = require('../models/user')

exports.read = (req, res) => {
    const userId = req.params.id;
    if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
            error: req.t('user.invalidId')
        })
    }
    User.findById(userId).exec()
        .then(user => {
            if (!user) {
                return res.status(400).json({
                    error: req.t('user.notFound')
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
                    error: req.t('user.notFound')
                })
            }
            if(!name) {
                return res.status(400).json({
                    error: req.t('user.nameRequired')
                })
            } else {
                user.name = name
            }
            if(password) {
                if(password.length < 6) {
                    return res.status(400).json({
                        error: req.t('user.passwordMinLength')
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
                        error: req.t('user.updateFailed')
                    })
                })
        });
}
