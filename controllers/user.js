const mongoose = require('mongoose')
const User = require('../models/user')

const VALID_ROLES = ['subscriber', 'admin']

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

// ============================================
// ADMIN USER MANAGEMENT
// ============================================

exports.listUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-hashed_password -salt')
            .sort({ createdAt: -1 })
            .exec()
        res.json({ data: users })
    } catch (e) {
        console.log('LIST USERS ERROR', e)
        return res.status(400).json({
            error: req.t('user.fetchError')
        })
    }
}

exports.removeUser = async (req, res) => {
    try {
        const { userId } = req.params
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                error: req.t('user.invalidId')
            })
        }
        if (userId === req.auth._id) {
            return res.status(400).json({
                error: req.t('user.cannotModifySelf')
            })
        }
        const user = await User.findByIdAndDelete(userId).exec()
        if (!user) {
            return res.status(400).json({
                error: req.t('user.notFound')
            })
        }
        res.json({ message: req.t('user.deleted') })
    } catch (e) {
        console.log('REMOVE USER ERROR', e)
        return res.status(400).json({
            error: req.t('user.deleteError')
        })
    }
}

exports.updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params
        const { role } = req.body
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                error: req.t('user.invalidId')
            })
        }
        if (userId === req.auth._id) {
            return res.status(400).json({
                error: req.t('user.cannotModifySelf')
            })
        }
        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({
                error: req.t('user.invalidRole')
            })
        }
        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select('-hashed_password -salt').exec()
        if (!user) {
            return res.status(400).json({
                error: req.t('user.notFound')
            })
        }
        res.json(user)
    } catch (e) {
        console.log('UPDATE USER ROLE ERROR', e)
        return res.status(400).json({
            error: req.t('user.updateFailed')
        })
    }
}

exports.updateUserBlocked = async (req, res) => {
    try {
        const { userId } = req.params
        const { isBlocked } = req.body
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                error: req.t('user.invalidId')
            })
        }
        if (userId === req.auth._id) {
            return res.status(400).json({
                error: req.t('user.cannotModifySelf')
            })
        }
        if (typeof isBlocked !== 'boolean') {
            return res.status(400).json({
                error: req.t('user.invalidBlocked')
            })
        }
        const user = await User.findByIdAndUpdate(
            userId,
            { isBlocked },
            { new: true }
        ).select('-hashed_password -salt').exec()
        if (!user) {
            return res.status(400).json({
                error: req.t('user.notFound')
            })
        }
        res.json(user)
    } catch (e) {
        console.log('UPDATE USER BLOCKED ERROR', e)
        return res.status(400).json({
            error: req.t('user.updateFailed')
        })
    }
}
